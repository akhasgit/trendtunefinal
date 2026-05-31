import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import type { DemographicResult } from "../types/demographic-result";
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

interface DemographicResultWithId extends DemographicResult {
  id: string;
}

const DemographicResultsTable: React.FC = () => {
  const [results, setResults] = useState<DemographicResultWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<{demographic: string, description: string, reason: string} | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchResults = async () => {
      setLoading(true);
      const resultsRef = collection(db, "demographic", userId, "results");
      const snapshot = await getDocs(resultsRef);
      const rawDocs = snapshot.docs.map(doc => doc.data());
      console.log('Raw Firestore docs:', rawDocs);
      const data: DemographicResultWithId[] = snapshot.docs.map(doc => {
        const raw = doc.data();
        // Transform demographics to match Demographic type
        const demographics = Array.isArray(raw.demographics)
          ? raw.demographics.map((d: any) => {
              const key = Object.keys(d)[0];
              const value = d[key];
              return {
                desc: key, // Demographic name
                reasoning: value["Reasoning"] || "",
                description: value["Demographic desc"] || "",
              };
            })
          : [];
        // Transform recommendations
        const recommendations = raw.recommendations && typeof raw.recommendations === 'object'
          ? Object.values(raw.recommendations).map(String)
          : [];
        return {
          demographics,
          recommendations,
          timestamp: raw.timestamp || '',
          id: doc.id,
        };
      });
      console.log('Mapped data for table:', data);
      // Sort by timestamp descending (most recent first)
      data.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      setResults(data);
      setLoading(false);
    };
    fetchResults();
  }, [userId]);

  if (!userId) return <div className="p-4">Please sign in to view your results.</div>;
  if (loading) return <div className="p-4">Loading...</div>;
  if (results.length === 0) return <div className="p-4">No results found.</div>;

  // Flatten all demographics from all results
  const allDemographics = results.flatMap(result => result.demographics.map(d => ({
    demographic: d.desc,
    description: d.description,
    reason: d.reasoning,
  })));
  // Flatten all recommendations from all results
  const allRecommendations = results.flatMap(result => result.recommendations);

  const handleEdit = (idx: number) => {
    setEditIdx(idx);
    const row = allDemographics[idx];
    setEditRow({
      demographic: row.demographic,
      description: row.description || '',
      reason: row.reason,
    });
  };

  const handleEditChange = (field: string, value: string) => {
    if (!editRow) return;
    setEditRow({ ...editRow, [field]: value });
  };

  const handleSave = async (idx: number) => {
    if (!userId || !editRow) return;
    setSavingIdx(idx);
    // Find the result and demographic index
    let runningIdx = 0;
    let resultIdx = -1;
    let demoIdx = -1;
    for (let i = 0; i < results.length; i++) {
      for (let j = 0; j < results[i].demographics.length; j++) {
        if (runningIdx === idx) {
          resultIdx = i;
          demoIdx = j;
          break;
        }
        runningIdx++;
      }
      if (resultIdx !== -1) break;
    }
    if (resultIdx === -1 || demoIdx === -1) return;
    // Prepare new demographics array for Firestore
    const oldDemo = results[resultIdx].demographics[demoIdx];
    const newDemoKey = editRow.demographic;
    const newDemoObj: any = {};
    newDemoObj[newDemoKey] = {
      "Demographic desc": editRow.description,
      "Reasoning": editRow.reason,
    };
    // Replace the demographic in the array
    const newDemographics = [...results[resultIdx].demographics];
    newDemographics[demoIdx] = {
      desc: editRow.demographic,
      reasoning: editRow.reason,
      description: editRow.description,
    };
    // But Firestore expects the array of { [key]: { ... } }
    const firestoreDemographics = newDemographics.map(d => {
      const obj: any = {};
      obj[d.desc] = {
        "Demographic desc": d.description,
        "Reasoning": d.reasoning,
      };
      return obj;
    });
    // Update Firestore
    const docId = results[resultIdx].id;
    const docRef = doc(db, "demographic", userId, "results", docId);
    await updateDoc(docRef, { demographics: firestoreDemographics });
    // Update local state
    const updatedResults = [...results];
    updatedResults[resultIdx].demographics = newDemographics;
    setResults(updatedResults);
    setEditIdx(null);
    setEditRow(null);
    setSavingIdx(null);
  };

  return (
    <div className="overflow-x-auto bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border border-gray-100 p-6">
      <div className="flex justify-end mb-4">
        <button
          className={`px-5 py-2 rounded-lg font-semibold shadow transition-colors duration-150 ${editMode ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setEditMode(v => !v)}
        >
          {editMode ? 'Exit Edit Mode' : 'Edit Table'}
        </button>
      </div>
      <table className="min-w-full divide-y divide-gray-100 rounded-2xl overflow-hidden bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-7 py-4 text-left text-sm font-bold text-gray-500 uppercase tracking-wider rounded-tl-2xl">Demographic</th>
            <th className="px-7 py-4 text-left text-sm font-bold text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-7 py-4 text-left text-sm font-bold text-gray-500 uppercase tracking-wider rounded-tr-2xl">Reason</th>
            {editMode && <th className="px-7 py-4"></th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {allDemographics.map((d, idx) => (
            <tr key={idx} className="hover:bg-blue-50 transition-colors">
              <td className="px-7 py-5 whitespace-normal break-words align-top max-w-xs text-gray-800 text-base">
                {editIdx === idx && editMode ? (
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2 text-base bg-gray-50 focus:ring-2 focus:ring-blue-200"
                    value={editRow?.demographic || ''}
                    onChange={e => handleEditChange('demographic', e.target.value)}
                  />
                ) : (
                  d.demographic
                )}
              </td>
              <td className="px-7 py-5 whitespace-normal break-words align-top max-w-md text-gray-800 text-base">
                {editIdx === idx && editMode ? (
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2 text-base bg-gray-50 focus:ring-2 focus:ring-blue-200"
                    value={editRow?.description || ''}
                    onChange={e => handleEditChange('description', e.target.value)}
                  />
                ) : (
                  d.description
                )}
              </td>
              <td className="px-7 py-5 whitespace-normal break-words align-top max-w-lg text-gray-800 text-base">
                {editIdx === idx && editMode ? (
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2 text-base bg-gray-50 focus:ring-2 focus:ring-blue-200"
                    value={editRow?.reason || ''}
                    onChange={e => handleEditChange('reason', e.target.value)}
                  />
                ) : (
                  d.reason
                )}
              </td>
              {editMode && (
                <td className="px-7 py-5 align-top">
                  {editIdx === idx ? (
                    <button
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow disabled:opacity-50"
                      onClick={() => handleSave(idx)}
                      disabled={savingIdx === idx}
                    >
                      {savingIdx === idx ? 'Saving...' : 'Save'}
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 shadow"
                      onClick={() => handleEdit(idx)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-center py-6">
        <button
          className="flex items-center gap-2 px-6 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none shadow font-semibold text-base"
          onClick={() => setShowRecommendations(v => !v)}
          aria-expanded={showRecommendations}
        >
          <span>{showRecommendations ? 'Hide Recommendations' : 'Show Recommendations'}</span>
          {showRecommendations ? (
            <ChevronUpIcon className="w-5 h-5" />
          ) : (
            <ChevronDownIcon className="w-5 h-5" />
          )}
        </button>
      </div>
      {showRecommendations && (
        <div className="px-8 pb-8">
          <table className="min-w-full bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
            <tbody>
              {allRecommendations.map((rec, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="px-7 py-4 text-base text-gray-800 whitespace-normal break-words">
                    {rec}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DemographicResultsTable; 