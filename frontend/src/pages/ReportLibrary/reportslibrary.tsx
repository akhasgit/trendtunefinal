// src/pages/ReportLibrary/ReportsLibrary.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { useAnonymousAuth } from "../../hooks/useAnonymousAuth";
import {
  collection,
  query,
  orderBy,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";

interface Report {
  id: string;
  reportName?: string;
  content?: string;
  timestamp?: Timestamp;
  [key: string]: any;
}

const ReportsLibrary: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAnonymousAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    (async () => {
      try {
        const ref = collection(db, "reports", user.uid, "chatGeneratedReports");
        const snap = await getDocs(query(ref, orderBy("timestamp", "desc")));
        const list: Report[] = snap.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => ({
            id: d.id,
            ...(d.data() as Omit<Report, "id">),
          })
        );
        setReports(list);
      } catch (err) {
        console.error(err);
        setError("Failed to load reports.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const downloadPdf = (name: string, markdown: string) => {
    const pdfDoc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdfDoc.internal.pageSize.getWidth() - 80;
    pdfDoc.setFontSize(14);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(name, 40, 60);

    pdfDoc.setFontSize(11);
    pdfDoc.setFont("helvetica", "normal");

    const plain = markdown
      .replace(/#+\s/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/[_*`>-]/g, "")
      .split("\n");
    let cursorY = 90;
    plain.forEach((line) => {
      const lines = pdfDoc.splitTextToSize(line, pageWidth);
      if (cursorY + lines.length * 14 > 780) {
        pdfDoc.addPage();
        cursorY = 40;
      }
      pdfDoc.text(lines, 40, cursorY);
      cursorY += lines.length * 14 + 6;
    });

    pdfDoc.save(`${name.replace(/\s+/g, "_")}.pdf`);
  };

  if (loading)
    return (
      <section className="p-6">
        <h1 className="text-2xl font-bold mb-2">Report Library</h1>
        <p className="text-gray-600">Loading…</p>
      </section>
    );

  if (error)
    return (
      <section className="p-6">
        <h1 className="text-2xl font-bold mb-2">Report Library</h1>
        <p className="text-red-600">{error}</p>
      </section>
    );

  if (reports.length === 0)
    return (
      <section className="p-6">
        <h1 className="text-2xl font-bold mb-2">Report Library</h1>
        <p className="text-gray-600">No reports found.</p>
      </section>
    );

  return (
    <div className="min-h-screen bg-white-100 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold mb-6">Your Report Library</h1>

        <ul className="space-y-5">
          {reports.map((rep) => {
            const date = rep.timestamp
              ? rep.timestamp.toDate().toLocaleString()
              : "";
            const open = expandedIds.has(rep.id);

            return (
              <li
                key={rep.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <button
                  onClick={() => toggle(rep.id)}
                  className="w-full flex justify-between items-center p-4 hover:bg-gray-50 focus:outline-none"
                  aria-expanded={open}
                >
                  <div className="flex flex-col text-left pr-4">
                    <span className="text-lg font-medium text-gray-800">
                      {rep.reportName ?? `Report ${rep.id}`}
                    </span>
                    {date && (
                      <span className="text-sm text-gray-500">{date}</span>
                    )}
                  </div>
                  <span className="text-2xl text-gray-500">
                    {open ? "−" : "+"}
                  </span>
                </button>

                {open && rep.content && (
                  <div className="border-t border-gray-200 px-6 py-4">
                    <article className="prose max-w-none text-gray-800">
                      <ReactMarkdown>{rep.content}</ReactMarkdown>
                    </article>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() =>
                          downloadPdf(
                            rep.reportName ?? `Report_${rep.id}`,
                            rep.content as string
                          )
                        }
                        className="px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ReportsLibrary;
