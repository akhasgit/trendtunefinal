// src/pages/ReportLibrary/ReportsLibrary.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
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

  /* ────────── fetch user’s reports ────────── */
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/signin");
        return;
      }

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
  }, [navigate]);

  /* ────────── helpers ────────── */
  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const downloadPdf = (name: string, markdown: string) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth() - 80; // 40pt margin each side
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(name, 40, 60);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    // basic markdown strip → plain text
    const plain = markdown
      .replace(/#+\s/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/[_*`>-]/g, "")
      .split("\n");
    let cursorY = 90;
    plain.forEach((line) => {
      const lines = doc.splitTextToSize(line, pageWidth);
      if (cursorY + lines.length * 14 > 780) {
        doc.addPage();
        cursorY = 40;
      }
      doc.text(lines, 40, cursorY);
      cursorY += lines.length * 14 + 6;
    });

    doc.save(`${name.replace(/\s+/g, "_")}.pdf`);
  };

  /* ────────── ui states ────────── */
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

  /* ────────── main render ────────── */
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
                {/* header row */}
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

                {/* body */}
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

                      {/* <button
                        onClick={() => console.log("Generate marketing report")}
                        className="px-4 py-2 rounded-md border border-green-600 text-green-600 hover:bg-green-50 transition"
                      >
                        Generate marketing report
                      </button> */}
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


// // src/pages/ReportLibrary/reportslibrary.tsx
// import React, { useState, useEffect } from "react"
// import { useNavigate } from "react-router-dom"
// import { auth, db } from "../../firebase/firebase"
// import {
//   collection,
//   query,
//   orderBy,
//   getDocs,
//   QueryDocumentSnapshot,
//   DocumentData,
//   Timestamp,
// } from "firebase/firestore"
// import ReactMarkdown from "react-markdown"

// interface Report {
//   id: string
//   reportName?: string
//   content?: string
//   timestamp?: Timestamp
//   [key: string]: any
// }

// const ReportsLibrary: React.FC = () => {
//   const [reports, setReports] = useState<Report[]>([])
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState<string | null>(null)
//   const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
//   const navigate = useNavigate()

//   useEffect(() => {
//     const fetchReports = async () => {
//       const user = auth.currentUser
//       if (!user) {
//         navigate("/signin")
//         return
//       }

//       try {
//         const reportsRef = collection(
//           db,
//           "reports",
//           user.uid,
//           "chatGeneratedReports"
//         )
//         const q = query(reportsRef, orderBy("timestamp", "desc"))
//         const snap = await getDocs(q)

//         const list: Report[] = snap.docs.map(
//           (d: QueryDocumentSnapshot<DocumentData>) => ({
//             id: d.id,
//             ...(d.data() as Omit<Report, "id">),
//           })
//         )
//         setReports(list)
//       } catch (err) {
//         console.error("Error fetching reports:", err)
//         setError("Failed to load reports.")
//       } finally {
//         setLoading(false)
//       }
//     }

//     fetchReports()
//   }, [navigate])

//   const toggle = (id: string) =>
//     setExpandedIds((prev) => {
//       const next = new Set(prev)
//       next.has(id) ? next.delete(id) : next.add(id)
//       return next
//     })

//   if (loading)
//     return (
//       <div className="p-4">
//         <h1 className="text-2xl font-bold mb-4">Your Report Library</h1>
//         <p>Loading…</p>
//       </div>
//     )

//   if (error)
//     return (
//       <div className="p-4">
//         <h1 className="text-2xl font-bold mb-4">Your Report Library</h1>
//         <p className="text-red-500">{error}</p>
//       </div>
//     )

//   if (reports.length === 0)
//     return (
//       <div className="p-4">
//         <h1 className="text-2xl font-bold mb-4">Your Report Library</h1>
//         <p>No reports found.</p>
//       </div>
//     )

//   return (
//     <div className="p-6">
//       <h1 className="text-3xl font-semibold mb-6">Your Report Library</h1>
//       <ul className="space-y-4">
//         {reports.map((rep) => {
//           const date = rep.timestamp
//             ? rep.timestamp.toDate().toLocaleString()
//             : ""
//           const isOpen = expandedIds.has(rep.id)

//           return (
//             <li
//               key={rep.id}
//               className="border rounded-lg overflow-hidden"
//             >
//               <button
//                 onClick={() => toggle(rep.id)}
//                 className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200 focus:outline-none"
//               >
//                 {/* Make this div span the available space so both title and timestamp are flush-left */}
//                 <div className="flex-1 text-left">
//                   <h2 className="text-xl font-medium">
//                     {rep.reportName ?? `Report ${rep.id}`}
//                   </h2>
//                   {date && (
//                     <div className="mt-1 text-sm text-gray-500">
//                       {date}
//                     </div>
//                   )}
//                 </div>
//                 <span className="text-2xl">
//                   {isOpen ? "−" : "+"}
//                 </span>
//               </button>

//               {isOpen && rep.content && (
//                 <div className="p-4 prose max-w-none bg-white">
//                   <ReactMarkdown>
//                     {rep.content}
//                   </ReactMarkdown>

//                   {/* Generate marketing report button */}
//                   <button
//                     onClick={() => console.log("Hello world")}
//                     className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
//                   >
//                     Generate marketing report
//                   </button>
//                 </div>
//               )}
//             </li>
//           )
//         })}
//       </ul>
//     </div>
//   )
// }

// export default ReportsLibrary
