// src/pages/Products/ProductsPage.tsx
import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { auth, db } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { useAnonymousAuth } from "../../hooks/useAnonymousAuth";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import qs from "qs";
import {
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/solid";

/* ────────────────────────────  CSV sanitization & parsing ──────────────────────────── */
const csvSplit = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;
function sanitizeDescription(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/[^A-Za-z0-9\s]/g, "")
    .trim();
}

/* ────────────────────────────  Shopify-scraper utilities ──────────────────────────── */
interface ShopifyProduct { [key: string]: any; }
function normalizeStoreUrl(storeUrl: string): string {
  try {
    const url = new URL(storeUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return `https://${storeUrl.replace(/^(?:https?:\/\/)?/, "")}`;
  }
}
function stripHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent ?? "";
}
async function fetchAllProducts(storeUrl: string): Promise<ShopifyProduct[]> {
  const base = normalizeStoreUrl(storeUrl);
  let url = `${base}/products.json?limit=250`;
  const all: ShopifyProduct[] = [];
  while (url) {
    const res = await fetch(url, { headers: { "User-Agent": "Product-Scraper/1.0" } });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const json = await res.json();
    all.push(...(json.products ?? []));
    const link = res.headers.get("link");
    const next = link?.split(",").find((l) => /rel="next"/.test(l));
    url = next ? next.match(/<([^>]+)>/)?.[1] ?? "" : "";
  }
  return all;
}

/* ────────────────────────────  Types & Helpers ──────────────────────────── */
interface Product {
  productName: string;
  productDescription: string;
  productQuantity: number;
  id?: string;
  skuId?: string;
}
interface ProductList {
  id: string;
  products: Product[];
}
const getRandomPopularity = () => {
  const value = Math.floor(Math.random() * 101);
  return { value, isUp: value >= 50 };
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://agenticchattt-310229311797.asia-southeast1.run.app";

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAnonymousAuth();
  /* ---------- state ---------- */
  const [productLists, setProductLists] = useState<ProductList[]>([]);
  const [selectedListIndex, setSelectedListIndex] = useState<number | null>(0);
  const [viewAll, setViewAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  /* Shopify stores state */
  const [shopifyStores, setShopifyStores] = useState<string[]>([]);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyUrl, setShopifyUrl] = useState("");

  /* CSV mapping state */
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawCsvRows, setRawCsvRows] = useState<string[][]>([]);
  const [mappingSelections, setMappingSelections] = useState<{
    name?: string;
    description?: string;
    quantity?: string;
    skuId?: string;
  }>({});

  /* Review mapping state */
  const [reviewCsvHeaders, setReviewCsvHeaders] = useState<string[]>([]);
  const [rawReviewRows, setRawReviewRows] = useState<string[][]>([]);
  const [reviewMappingSelections, setReviewMappingSelections] = useState<{
    name?: string;
    reviewText?: string;
    sentiment?: string;
  }>({});

  /* refs */
  const skuInputRef = useRef<HTMLInputElement>(null);
  const reviewInputRef = useRef<HTMLInputElement>(null);
  const [currentReviewListId, setCurrentReviewListId] = useState<string | null>(null);
  const [reviewUploading, setReviewUploading] = useState(false);
  const [listsWithReviews, setListsWithReviews] = useState<Set<string>>(new Set());

  /* Sync helper */
  const update_file = async (uid: string) => {
    try {
      const res = await axios.post(
        `${API_BASE}/products/all-products-and-reviews`,
        qs.stringify({ user_id: uid }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      if (res.data.vector_store_id) {
        await setDoc(doc(db, "users", uid), { vector_store_id: res.data.vector_store_id }, { merge: true });
      }
    } catch (e) {
      console.error("Vector sync failed:", e);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (authUser) {
      setUserId(authUser.uid);
      fetchAllProductLists(authUser).then(() =>
        fetchUserShopifyStores(authUser)
      );
    }
    setLoading(false);
  }, [authUser, authLoading]);

  /* Fetch user’s stores */
  const fetchUserShopifyStores = async (user: User) => {
    try {
      const ud = await getDoc(doc(db, "users", user.uid));
      const data = ud.data();
      if (data?.shopifyStores && Array.isArray(data.shopifyStores)) {
        setShopifyStores(data.shopifyStores as string[]);
      }
    } catch (e) {
      console.error("Failed to fetch shopifyStores:", e);
    }
  };

  /* ──────────────────────────── Shopify connect ──────────────────────────── */
  const handleShopifySubmit = async () => {
    if (!shopifyUrl || !userId) return;
    try {
      setError(null);
      await updateDoc(doc(db, "users", userId), {
        shopifyStores: arrayUnion(shopifyUrl),
      });
      setShopifyStores((prev) => [...prev, shopifyUrl]);

      const shopProducts = await fetchAllProducts(shopifyUrl);
      const products: Product[] = shopProducts.map((p) => ({
        productName: p.title ?? "",
        productDescription: p.body_html ? sanitizeDescription(stripHtml(p.body_html)) : "",
        productQuantity: 1,
        skuId: String(p.id ?? ""),
      }));
      setProductLists((prev) => [...prev, { id: "unsaved", products }]);
      setSelectedListIndex(productLists.length);
    } catch (err: any) {
      console.error(err);
      setError("Failed to connect Shopify store.");
    } finally {
      setShowShopifyModal(false);
      setShopifyUrl("");
    }
  };

  const handleShopifyFetch = async (url: string) => {
    try {
      setError(null);
      const shopProducts = await fetchAllProducts(url);
      const products: Product[] = shopProducts.map((p) => ({
        productName: p.title ?? "",
        productDescription: p.body_html ? sanitizeDescription(stripHtml(p.body_html)) : "",
        productQuantity: 1,
        skuId: String(p.id ?? ""),
      }));
      setProductLists((prev) => [...prev, { id: "unsaved", products }]);
      setSelectedListIndex(productLists.length);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch Shopify products.");
    }
  };

  /* ──────────────────────────── Fetch saved lists ──────────────────────────── */
  const fetchAllProductLists = async (user: User) => {
    try {
      const listsCol = collection(db, "products", user.uid, "productLists");
      const listSnap = await getDocs(listsCol);
      const loaded: ProductList[] = [];

      for (const l of listSnap.docs) {
        const prodsSnap = await getDocs(
          collection(db, "products", user.uid, "productLists", l.id, "products")
        );
        loaded.push({
          id: l.id,
          products: prodsSnap.docs.map((p) => {
            const d = p.data() as any;
            return {
              id: p.id,
              productName: d.productName,
              productDescription: d.productDescription,
              productQuantity: d.productQuantity,
              skuId: (d.SKU as string) ?? undefined,
            };
          }),
        });
      }

      setProductLists(loaded);

      const flags = new Set<string>();
      for (const list of loaded) {
        const snap = await getDocs(
          collection(db, "products", user.uid, "productLists", list.id, "reviews")
        );
        if (!snap.empty) flags.add(list.id);
      }
      setListsWithReviews(flags);
    } catch (err) {
      console.error(err);
      setError("Error loading product lists.");
    }
  };

  /* ──────────────────────────── CRUD helpers ──────────────────────────── */
  const deleteProduct = async (listId: string, prodId: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, "products", userId, "productLists", listId, "products", prodId));
      setProductLists((prev) =>
        prev.map((l) =>
          l.id !== listId
            ? l
            : { ...l, products: l.products.filter((p) => p.id !== prodId) }
        )
      );
    } catch {
      setError("Failed to delete product.");
    }
  };

  const deleteProductList = async (listId: string) => {
    if (!userId) return;
    try {
      const prodsSnap = await getDocs(
        collection(db, "products", userId, "productLists", listId, "products")
      );
      await Promise.all(prodsSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "products", userId, "productLists", listId));
      setProductLists((prev) => prev.filter((l) => l.id !== listId));
      setSelectedListIndex(0);
    } catch {
      setError("Failed to delete product list.");
    }
  };

  /* ──────────────────────────── Inline editing ──────────────────────────── */
  const updateLocalProduct = (
    listId: string,
    prodId: string,
    field: keyof Product,
    value: string | number
  ) =>
    setProductLists((prev) =>
      prev.map((li) =>
        li.id !== listId
          ? li
          : {
              ...li,
              products: li.products.map((p) =>
                p.id !== prodId ? p : { ...p, [field]: value }
              ),
            }
      )
    );

  const saveDescription = async (
    listId: string,
    prodId: string,
    desc: string
  ) => {
    if (!userId || listId === "unsaved") return;
    try {
      await updateDoc(
        doc(db, "products", userId, "productLists", listId, "products", prodId),
        { productDescription: desc }
      );
    } catch {
      setError("Failed to update description.");
    }
  };

  const saveQuantity = async (
    listId: string,
    prodId: string,
    qty: number
  ) => {
    if (!userId || listId === "unsaved") return;
    try {
      await updateDoc(
        doc(db, "products", userId, "productLists", listId, "products", prodId),
        { productQuantity: qty }
      );
    } catch {
      setError("Failed to update quantity.");
    }
  };

  /* ──────────────────────────── CSV: SKU upload ──────────────────────────── */
  const triggerSkuUpload = () => skuInputRef.current?.click();
  const handleSkuUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return setError("Please select a file.");
    if (file.type !== "text/csv") {
      setError("Unsupported file type. Please upload a CSV.");
      e.target.value = "";
      return;
    }
    setError(null);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((r) => r.trim());
    const parsed = lines.map((line) =>
      line.split(csvSplit).map((cell) => cell.trim().replace(/^"|"$/g, ""))
    );
    if (parsed.length < 2) {
      setError("CSV must have a header row and at least one data row.");
      e.target.value = "";
      return;
    }
    setCsvHeaders(parsed[0]);
    setRawCsvRows(parsed.slice(1));
    setMappingSelections({});
    e.target.value = "";
  };

  const confirmSkuMapping = () => {
    const { name, description, quantity, skuId } = mappingSelections;
    if (!name || !description || quantity === undefined) {
      setError("Please select a column for each mapping.");
      return;
    }
    if (skuId && skuId === name) {
      setError("Product Name and SKU ID cannot be the same column.");
      return;
    }
    const hasQty = quantity !== "__none__";
    const hasSkuId = skuId !== undefined && skuId !== "__none__";
    const idxName = csvHeaders.indexOf(name);
    const idxDesc = csvHeaders.indexOf(description);
    const idxQty = hasQty ? csvHeaders.indexOf(quantity as string) : -1;
    const idxSku = hasSkuId ? csvHeaders.indexOf(skuId as string) : -1;
    if (
      idxName < 0 ||
      idxDesc < 0 ||
      (hasQty && idxQty < 0) ||
      (hasSkuId && idxSku < 0)
    ) {
      setError("Invalid column selection.");
      return;
    }
    const products: Product[] = rawCsvRows.map((cols) => ({
      productName: cols[idxName] || "",
      productDescription: sanitizeDescription(cols[idxDesc] || ""),
      productQuantity: hasQty ? Number(cols[idxQty]) || 1 : 1,
      ...(hasSkuId && { skuId: cols[idxSku] || "" }),
    }));
    setProductLists((prev) => [...prev, { id: "unsaved", products }]);
    setSelectedListIndex(productLists.length);
    setCsvHeaders([]);
    setRawCsvRows([]);
    setMappingSelections({});
  };

  const cancelCsvMapping = () => {
    setCsvHeaders([]);
    setRawCsvRows([]);
    setMappingSelections({});
  };

  /* ──────────────────────────── CSV: reviews ──────────────────────────── */
  const UploadReviewsForEachProductList = (listId: string) => {
    setCurrentReviewListId(listId);
    reviewInputRef.current?.click();
  };
  const handleReviewUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentReviewListId) return;
    if (file.type !== "text/csv") { alert("Please upload a .csv file"); return; }
    setError(null);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((r) => r.trim());
    if (lines.length < 2) { alert("CSV needs header + data row."); return; }
    setReviewCsvHeaders(lines[0].split(",").map((h) => h.trim()));
    setRawReviewRows(lines.slice(1).map((r) => r.split(",").map((c) => c.trim())));
    setReviewMappingSelections({});
    e.target.value = "";
  };
  const confirmReviewMapping = async () => {
    const { name, reviewText, sentiment } = reviewMappingSelections;
    if (!name || !reviewText || !sentiment) {
      setError("Please map Product Name, Review Text and Sentiment.");
      return;
    }
    const idxName = reviewCsvHeaders.indexOf(name);
    const idxRev = reviewCsvHeaders.indexOf(reviewText);
    const idxSent = reviewCsvHeaders.indexOf(sentiment);
    if (idxName < 0 || idxRev < 0 || idxSent < 0) {
      setError("Invalid column selections.");
      return;
    }
    setReviewUploading(true);
    try {
      const user = auth.currentUser!;
      const reviewsCol = collection(
        db,
        "products",
        user.uid,
        "productLists",
        currentReviewListId!,
        "reviews"
      );
      for (let i = 0; i < rawReviewRows.length; i++) {
        const row = rawReviewRows[i];
        await addDoc(reviewsCol, {
          productName: row[idxName] || "",
          review: row[idxRev] || "",
          sentiment: row[idxSent] || "",
          reviewid: `row-${i + 1}`,
          productId: "",
          uploadedAt: serverTimestamp(),
        });
      }
      setListsWithReviews((prev) => new Set(prev).add(currentReviewListId!));
      alert("Reviews uploaded.");
      setReviewCsvHeaders([]);
      setRawReviewRows([]);
      setReviewMappingSelections({});
      setCurrentReviewListId(null);
      if (userId) await update_file(userId);
    } catch {
      setError("Failed to upload reviews.");
    } finally {
      setReviewUploading(false);
    }
  };
  const cancelReviewCsvMapping = () => {
    setReviewCsvHeaders([]);
    setRawReviewRows([]);
    setReviewMappingSelections({});
    setCurrentReviewListId(null);
  };

  /* ──────────────────────────── Save to Firestore ──────────────────────────── */
  const saveProductsToFirestore = async () => {
    const user = auth.currentUser;
    if (!user) { setError("User not authenticated."); return; }
    setSaving(true);
    try {
      const newList = productLists[productLists.length - 1];
      const listDoc = await addDoc(
        collection(db, "products", user.uid, "productLists"),
        { createdAt: serverTimestamp() }
      );
      const listId = listDoc.id;

      for (const prod of newList.products) {
        const data: any = {
          productName: prod.productName,
          productDescription: prod.productDescription,
          productQuantity: prod.productQuantity,
          productAddedDate: serverTimestamp(),
          productListsId: listId,
        };
        if (prod.skuId) {
          data.SKU = prod.skuId;
          await setDoc(
            doc(db, "products", user.uid, "productLists", listId, "products", prod.skuId),
            data
          );
        } else {
          await addDoc(
            collection(db, "products", user.uid, "productLists", listId, "products"),
            data
          );
        }
      }

      await update_file(user.uid!);
      alert("Products saved to Firestore.");
      await fetchAllProductLists(user);
      setSelectedListIndex(0);
    } catch {
      setError("Error saving to Firestore.");
    } finally {
      setSaving(false);
    }
  };

  /* ──────────────────────────── Styles & Render Helpers ──────────────────────────── */
  const prettyInput =
    "bg-gray-50 border border-transparent shadow-inner rounded-lg px-3 py-2 w-full transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const sparkleBtn =
    "p-2 text-blue-600 rounded-lg bg-transparent hover:bg-blue-50 transition";

  const renderTrendTable = (
    items: (Product & { value: number; isUp: boolean })[],
    keyPrefix: string
  ) => (
    <div className="overflow-x-auto border border-gray-300 rounded-lg">
      <table className="min-w-full divide-y divide-gray-300 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-gray-800">
              Name
            </th>
            <th className="px-4 py-2 text-left font-semibold text-gray-800">
              Popularity
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {items.map((item, idx) => (
            <tr
              key={`${keyPrefix}-${item.id ?? item.productName}-${idx}`}
              className="hover:bg-gray-50"
            >
              <td className="px-4 py-2 text-gray-900">
                {item.productName}
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1">
                  <span
                    className={`font-medium ${
                      item.isUp ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {item.value}%
                  </span>
                  {item.isUp ? (
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTable = (products: Product[], listId: string) => (
    <div className="overflow-x-auto border border-gray-300 rounded-lg">
      <table className="min-w-full divide-y divide-gray-300 text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-gray-800">
              Popularity
            </th>
            <th className="px-4 py-2 text-left font-semibold text-gray-800">
              Name
            </th>
            <th className="px-4 py-2 text-left font-semibold text-gray-800">
              Description
            </th>
            <th className="px-4 py-2 text-left font-semibold text-gray-800">
              Quantity
            </th>
            {listsWithReviews.has(listId) && (
              <th className="px-4 py-2 text-center font-semibold text-gray-800">
                Summary
              </th>
            )}
            <th className="px-4 py-2 text-center font-semibold text-gray-800">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {products.map((p) => {
            const pop = getRandomPopularity();
            return (
              <tr key={p.id || p.productName} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span
                      className={`font-medium ${
                        pop.isUp ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {pop.value}%
                    </span>
                    {pop.isUp ? (
                      <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-900">
                  {p.productName}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-start gap-2">
                    <textarea
                      rows={2}
                      value={p.productDescription}
                      onChange={(e) =>
                        updateLocalProduct(
                          listId,
                          p.id!,
                          "productDescription",
                          e.target.value
                        )
                      }
                      onBlur={(e) =>
                        saveDescription(
                          listId,
                          p.id!,
                          e.target.value.trim()
                        )
                      }
                      className={`${prettyInput} resize-y flex-1`}
                    />
                    <button
                      type="button"
                      className={sparkleBtn}
                      onClick={() => console.log("sparkle!")}
                      aria-label="Sparkle"
                    >
                      <SparklesIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    value={p.productQuantity}
                    onChange={(e) =>
                      updateLocalProduct(
                        listId,
                        p.id!,
                        "productQuantity",
                        Number(e.target.value)
                      )
                    }
                    onBlur={(e) =>
                      saveQuantity(
                        listId,
                        p.id!,
                        Number(e.target.value)
                      )
                    }
                    className={`${prettyInput} w-24 text-right`}
                  />
                </td>
                {listsWithReviews.has(listId) && (
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => console.log("view summary")}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                )}
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => deleteProduct(listId, p.id!)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  /* ──────────────────────────── Main render ──────────────────────────── */
  if (loading)
    return (
      <p className="h-screen grid place-content-center text-lg text-gray-700">
        Loading products…
      </p>
    );

  const combinedProducts = productLists.flatMap((l) => l.products);
  const hasProducts = productLists.length > 0;

  // build trending overview
  const productsWithPop = combinedProducts.map((p) => ({
    ...p,
    ...getRandomPopularity(),
  }));
  const sortedProducts = [...productsWithPop].sort((a, b) => b.value - a.value);
  const maxTrend = Math.min(10, sortedProducts.length);
  const topTrending = sortedProducts.slice(0, maxTrend);
  const leastTrending = sortedProducts.slice(sortedProducts.length - maxTrend);

  return (
    <div className="min-h-screen bg-white-100 p-6 md:p-10 text-gray-900">
           {/* ← Back button */}
     <button
       onClick={() => navigate(-1)}  // go back in history; or use navigate("/") to jump home
       className="mb-6 inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
     >
       ← Back
      </button>
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold">Products Management</h1>
          <p className="text-gray-600 mt-1">
            Connect Shopify, upload SKUs & reviews and get insights on your products
          </p>
        </header>

        {/* trending overview */}
        {hasProducts && (
          <section className="mt-6">
            <div className="flex flex-col md:flex-row md:space-x-6">
              {/* Top Trending */}
              <div className="flex-1 mb-6 md:mb-0">
                <h2 className="text-xl font-semibold mb-2">Top Trending Products</h2>
                {renderTrendTable(topTrending, "top")}
              </div>
              {/* Least Trending */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">Least Trending Products</h2>
                {renderTrendTable(leastTrending, "least")}
              </div>
            </div>
          </section>
        )}

        {/* Shopify connect & CSV upload */}
        <div className="flex flex-wrap gap-3 items-center">
          {shopifyStores.length === 0 ? (
            <button
              onClick={() => setShowShopifyModal(true)}
              className="px-5 py-2.5 border border-gray-400 rounded-md bg-white hover:bg-gray-200 transition"
            >
              Connect Shopify
            </button>
          ) : (
            <select
              className="px-4 py-2 border border-gray-300 rounded-md"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__addNew") {
                  setShowShopifyModal(true);
                } else if (v) {
                  handleShopifyFetch(v);
                }
              }}
            >
              <option value="" disabled>
                Select a Shopify store…
              </option>
              {shopifyStores.map((url) => (
                <option key={url} value={url}>
                  {url}
                </option>
              ))}
              <option value="__addNew">+ Add another store</option>
            </select>
          )}

          {shopifyStores.length > 0 && (
            <button
              onClick={() => setShowShopifyModal(true)}
              className="px-5 py-2.5 border border-gray-400 rounded-md bg-white hover:bg-gray-200 transition"
            >
              Connect Shopify
            </button>
          )}

          <button
            onClick={triggerSkuUpload}
            className="px-5 py-2.5 border border-gray-400 rounded-md bg-white hover:bg-gray-200 transition"
          >
            Upload CSV
          </button>
        </div>

       

        {/* Shopify URL Modal */}
        {showShopifyModal && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-lg">
              <h2 className="text-lg font-semibold mb-4">
                Enter your Shopify URL
              </h2>
              <input
                type="url"
                placeholder="https://your-store.myshopify.com"
                value={shopifyUrl}
                onChange={(e) => setShopifyUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowShopifyModal(false);
                    setShopifyUrl("");
                  }}
                  className="px-4 py-2 border border-gray-400 rounded-md hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShopifySubmit}
                  disabled={!shopifyUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700 transition"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* hidden file inputs */}
        <input
          ref={skuInputRef}
          type="file"
          accept=".csv"
          onChange={handleSkuUpload}
          className="hidden"
        />
        <input
          ref={reviewInputRef}
          type="file"
          accept=".csv"
          onChange={handleReviewUpload}
          className="hidden"
        />

        {error && <p className="text-red-600">{error}</p>}

        {/* SKU mapping UI */}
        {csvHeaders.length > 0 && (
          <div className="border border-gray-300 bg-white rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold">
              Map SKU CSV Columns
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {(
                [
                  ["name", "Product Name"],
                  ["description", "Description"],
                  ["quantity", "Quantity"],
                  ["skuId", "SKU ID"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block mb-2 text-sm font-medium">
                    {label}
                  </label>
                  <select
                    className="w-full border-gray-300 rounded-md p-2.5"
                    value={(mappingSelections as any)[key] || ""}
                    onChange={(e) =>
                      setMappingSelections((m) => ({
                        ...m,
                        [key]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select…</option>
                    {(key === "quantity" || key === "skuId") && (
                      <option value="__none__">
                        {key === "quantity"
                          ? "No quantity column"
                          : "No SKU ID column"}
                      </option>
                    )}
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={confirmSkuMapping}
                className="px-5 py-2.5 border border-gray-400 rounded-md bg-white hover:bg-gray-200 transition"
              >
                Confirm
              </button>
              <button
                onClick={cancelCsvMapping}
                className="px-5 py-2.5 border border-gray-400 rounded-md bg-white hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Review mapping UI */}
        {reviewCsvHeaders.length > 0 && (
          <div className="border border-gray-300 bg-white rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold">
              Map Review CSV Columns
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {(
                [
                  ["name", "Product Name"],
                  ["reviewText", "Review Text"],
                  ["sentiment", "Sentiment"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block mb-2 text-sm font-medium">
                    {label}
                  </label>
                  <select
                    className="w-full border-gray-300 rounded-md p-2.5"
                    value={(reviewMappingSelections as any)[key] || ""}
                    onChange={(e) =>
                      setReviewMappingSelections((m) => ({
                        ...m,
                        [key]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select…</option>
                    {reviewCsvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={confirmReviewMapping}
                disabled={reviewUploading}
                className={`px-5 py-2.5 border border-gray-400 rounded-md bg-white hover:bg-gray-200 transition ${
                  reviewUploading ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {reviewUploading ? "Uploading…" : "Confirm Reviews"}
              </button>
              <button
                onClick={cancelReviewCsvMapping}
                className="px-5 py-2.5 border border-gray-400 rounded-md bg-white hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Save newly imported Shopify list */}
        {productLists.at(-1)?.id === "unsaved" && (
          <button
            onClick={saveProductsToFirestore}
            disabled={saving}
            className={`mt-6 px-6 py-3 border border-blue-600 rounded-md bg-white hover:bg-blue-800 transition ${
              !saving ? "animate-pulse" : ""
            }`}
          >
            {saving ? "Saving…" : "Save to Database"}
          </button>
        )}

        {/* Render lists */}
        {hasProducts && (
          <>
            {productLists.length > 1 && (
              <div className="flex gap-4">
                <button
                  onClick={() => setViewAll(false)}
                  className={`px-4 py-1.5 rounded-md border ${
                    !viewAll ? "bg-gray-300" : "bg-white"
                  }`}
                >
                  View Individually
                </button>
                <button
                  onClick={() => setViewAll(true)}
                  className={`px-4 py-1.5 rounded-md border ${
                    viewAll ? "bg-gray-300" : "bg-white"
                  }`}
                >
                  View All
                </button>
              </div>
            )}
            {viewAll ? (
              renderTable(combinedProducts, "")
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {productLists.map((list, idx) => (
                    <div
                      key={list.id}
                      className="flex items-center gap-1 bg-gray-200 rounded-full px-3 py-1"
                    >
                      <button
                        onClick={() => setSelectedListIndex(idx)}
                        className={`text-sm ${
                          selectedListIndex === idx
                            ? "font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        List {idx + 1}
                      </button>
                      <button
                        onClick={() => deleteProductList(list.id)}
                        className="text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {selectedListIndex !== null && (
                  <>
                    {renderTable(
                      productLists[selectedListIndex].products,
                      productLists[selectedListIndex].id
                    )}
                    <div className="mt-6">
                      <button
                        onClick={() =>
                          UploadReviewsForEachProductList(
                            productLists[selectedListIndex].id
                          )
                        }
                        disabled={reviewUploading}
                        className={`px-6 py-3 border border-gray-400 rounded-md bg-white hover:bg-gray-200 transition ${
                          reviewUploading ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      >
                        {reviewUploading
                          ? "Uploading…"
                          : "Upload Reviews"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;


