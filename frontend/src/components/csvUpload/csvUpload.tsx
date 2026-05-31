"use client"

import React from "react"
import { useState, type DragEvent, type ChangeEvent } from "react"
import { collection, addDoc, doc, setDoc, serverTimestamp, getDocs, getDoc } from "firebase/firestore"
import { db } from "../../firebase/firebase"
import { useAnonymousAuth } from "../../hooks/useAnonymousAuth"
import { CloudArrowUpIcon, DocumentIcon, CheckCircleIcon, ArrowPathIcon, SparklesIcon } from "@heroicons/react/24/solid"
import FirstTimeUpload from "./firstTimeUpload"
import { getOpenAIKey, OPENAI_CONFIG } from "../../config/openai"
import { triggerDemographicInference } from "../../apis/demographicInference"

interface MappingSelections {
  name?: string
  description?: string
  quantity?: string
  skuId?: string
}

interface Product {
  productName: string
  productDescription: string
  productQuantity: number
  skuId?: string
}

interface CsvUploadProps {
  onUploadComplete: () => void
}

const csvSplit = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/

const CsvUpload: React.FC<CsvUploadProps> = ({ onUploadComplete }) => {
  const { user } = useAnonymousAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<MappingSelections>({})
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showFirstWidget, setShowFirstWidget] = useState(false)
  const [isAiMapping, setIsAiMapping] = useState(false)
  const [aiMappingProgress, setAiMappingProgress] = useState("")

  const parseCsv = (txt: string) => {
    const lines = txt.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return
    const parsed = lines.map((l) => l.split(csvSplit).map((c) => c.trim().replace(/^"|"$/g, "")))
    setCsvHeaders(parsed[0])
    setRawRows(parsed.slice(1))
  }

  // OpenAI-powered column mapping function
  const performAiMapping = async (headers: string[], sampleRows: string[][]) => {
    setIsAiMapping(true)
    setAiMappingProgress("Analyzing column headers...")
    
    try {
      // Prepare sample data for AI analysis
      const sampleData = sampleRows.slice(0, 3).map(row => 
        headers.reduce((obj, header, index) => {
          obj[header] = row[index] || ""
          return obj
        }, {} as Record<string, string>)
      )

      setAiMappingProgress("TrendTune is analyzing your data structure...")

      const prompt = `
You are an expert at analyzing CSV files and mapping columns to product fields. 

Given these CSV headers: ${JSON.stringify(headers)}

And these sample rows:
${JSON.stringify(sampleData, null, 2)}

Please map the columns to these product fields:
- name: Product name/title (required)
- description: Product description/details (required) 
- quantity: Product quantity/stock (optional)
- skuId: Product SKU/ID (optional)

Return ONLY a JSON object with the mapping, like this:
{
  "name": "column_name_here",
  "description": "column_name_here", 
  "quantity": "column_name_here" or null,
  "skuId": "column_name_here" or null
}

If a field cannot be mapped, use null. Only return the JSON object, no other text.
`

      const response = await fetch(`${OPENAI_CONFIG.BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getOpenAIKey()}`
        },
        body: JSON.stringify({
          model: OPENAI_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that analyzes CSV files and maps columns to product fields. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 200
        })
      })

      setAiMappingProgress("Processing AI response...")

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content

      if (!aiResponse) {
        throw new Error("No response from AI")
      }

      // Parse the JSON response
      const aiMapping = JSON.parse(aiResponse.trim())
      
      setAiMappingProgress("Mapping columns to product fields...")

      setMapping({
        name: aiMapping.name || "",
        description: aiMapping.description || "",
        quantity: aiMapping.quantity || "__none__",
        skuId: aiMapping.skuId || "__none__"
      })

      setAiMappingProgress("Mapping complete!")
      
      // Show success briefly
      setTimeout(() => {
        setIsAiMapping(false)
        setAiMappingProgress("")
      }, 1000)

    } catch (error) {
      console.error("AI mapping failed:", error)
      setAiMappingProgress("AI mapping failed, please map manually")
      setTimeout(() => {
        setIsAiMapping(false)
        setAiMappingProgress("")
      }, 2000)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFileName(f.name)
      const text = await f.text()
      parseCsv(text)
    }
  }

  const handleSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFileName(f.name)
      const text = await f.text()
      parseCsv(text)
    }
  }

  // Auto-trigger AI mapping when CSV is parsed
  React.useEffect(() => {
    if (csvHeaders.length > 0 && rawRows.length > 0 && Object.keys(mapping).length === 0) {
      performAiMapping(csvHeaders, rawRows)
    }
  }, [csvHeaders, rawRows])

  const handleSave = async () => {
    if (!mapping.name || !mapping.description) {
      alert("Please map at least Name and Description.")
      return
    }
    if (!user) {
      alert("Please wait for authentication to complete.")
      return
    }

    setSaving(true)
    try {
      const [planSnap, listSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDocs(collection(db, "products", user.uid, "productLists")),
      ])
      const isFree = planSnap.exists() && (planSnap.data().current_plan || "").toLowerCase() === "free"
      const isFirstUpload = listSnap.docs.length === 0

      const idxName = csvHeaders.indexOf(mapping.name)
      const idxDesc = csvHeaders.indexOf(mapping.description)
      const idxQty = mapping.quantity && mapping.quantity !== "__none__" ? csvHeaders.indexOf(mapping.quantity) : -1
      const idxSku = mapping.skuId && mapping.skuId !== "__none__" ? csvHeaders.indexOf(mapping.skuId) : -1

      const products: Product[] = rawRows.map((cols) => ({
        productName: cols[idxName] || "",
        productDescription: cols[idxDesc] || "",
        productQuantity: idxQty >= 0 ? Number(cols[idxQty]) || 1 : 1,
        ...(idxSku >= 0 && { skuId: cols[idxSku] || "" }),
      }))

      const listRef = await addDoc(collection(db, "products", user.uid, "productLists"), {
        createdAt: serverTimestamp(),
      })
      const listId = listRef.id

      await Promise.all(
        products.map(async (p) => {
          const base = {
            productName: p.productName,
            productDescription: p.productDescription,
            productQuantity: p.productQuantity,
            productAddedDate: serverTimestamp(),
          }
          if (p.skuId) {
            await setDoc(doc(db, "products", user.uid, "productLists", listId, "products", p.skuId), {
              ...base,
              SKU: p.skuId,
            })
          } else {
            await addDoc(collection(db, "products", user.uid, "productLists", listId, "products"), base)
          }
        }),
      )

      // 🔥 FIRE AND FORGET: Trigger demographic inference after products are uploaded
      try {
        triggerDemographicInference(user.uid)
      } catch (error) {
        console.error('Failed to trigger demographic inference:', error)
      }

      await setDoc(
        doc(db, "homepageInfo", user.uid),
        {
          AlignmentScore: 0,
          mapId: "",
          needsAttention: 0,
          newSuggestions: 0,
          productsAligned: 0,
          isLoading: true,
        },
        { merge: true },
      )

      if (!(isFree && isFirstUpload)) {
        onUploadComplete()
      }

      if (isFree && isFirstUpload) {
        setShowFirstWidget(true)
      } else {
        setShowSuccess(true)
      }
    } catch (err) {
      console.error("CSV save error:", err)
      alert("Failed to save products.")
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setCsvHeaders([])
    setRawRows([])
    setMapping({})
    setFileName(null)
    setIsAiMapping(false)
    setAiMappingProgress("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Success Modal */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl border-0 w-96">
              <div className="p-8 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">Upload Successful!</h2>
                  <p className="text-gray-600">Your products have been processed and analyzed.</p>
                </div>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Upload Card */}
        <div className="bg-white rounded-xl shadow-xl border-0">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CloudArrowUpIcon className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">CSV Upload</h2>
                <p className="text-gray-600 mt-1">
                  Upload your product catalog to begin AI-powered trend alignment analysis
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {!csvHeaders.length ? (
              /* Upload Zone */
              <div
                className={`relative border-2 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                  isDragging
                    ? "border-blue-400 bg-blue-50 scale-105"
                    : "border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("csv-input")?.click()}
              >
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mx-auto">
                    <DocumentIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {fileName ? `Ready to process: ${fileName}` : "Drop your CSV file here"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">or click to browse your files</p>
                  </div>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    Supports CSV, XLS, XLSX files
                  </span>
                </div>
                <input id="csv-input" type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleSelect} />
              </div>
            ) : (
              /* Column Mapping */
              <div className="space-y-6">
                {isAiMapping ? (
                  // AI Mapping Loading State
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="relative">
                        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-purple-700 font-medium">{aiMappingProgress}</p>
                        <div className="flex space-x-1 mt-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Mapping UI
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Map CSV Columns</h3>
                        <p className="text-sm text-gray-500">Connect your CSV columns to our product fields</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          {rawRows.length} products detected
                        </span>
                        {Object.keys(mapping).length === 0 && (
                          <button
                            onClick={() => performAiMapping(csvHeaders, rawRows)}
                            className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
                          >
                            <SparklesIcon className="w-4 h-4" />
                            AI Auto-Map
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { key: "name", label: "Product Name", required: true },
                        { key: "description", label: "Description", required: true },
                        { key: "quantity", label: "Quantity", required: false },
                        { key: "skuId", label: "SKU ID", required: false },
                      ].map(({ key, label, required }) => (
                        <div key={key} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {label}
                            {required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            value={(mapping as any)[key] ?? ""}
                            onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                            disabled={isAiMapping}
                          >
                            <option value="">Select column...</option>
                            {!required && <option value="__none__">No {label.toLowerCase()} column</option>}
                            {csvHeaders.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={handleSave}
                        disabled={saving || !mapping.name || !mapping.description || isAiMapping}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2 rounded-lg font-medium shadow-lg transition-colors flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Start Analysis"
                        )}
                      </button>
                      <button
                        onClick={resetForm}
                        className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-8 py-2 rounded-lg font-medium transition-colors"
                        disabled={isAiMapping}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {saving && (
          <div className="bg-white rounded-xl shadow-lg border-0">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Processing Your Data</h3>
                <p className="text-gray-600">
                  Our AI is analyzing your products and matching them with current market trends...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* First Time Widget */}
        {showFirstWidget && !saving && (
          <div className="mt-12">
            <FirstTimeUpload
              onDone={() => {
                onUploadComplete()
                setShowFirstWidget(false)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default CsvUpload

