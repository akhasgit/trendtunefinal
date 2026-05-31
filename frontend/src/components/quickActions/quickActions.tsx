"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../../firebase/firebase"
import { XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/solid"
import { 
  ActionDocument, 
  FirestoreAction,
  isNewSchema,
  isCurrentSchema
} from "../../types/actions"
import { generateActionDisplay } from "../../utils/actionDisplay"

interface TakeActionProps {
  isOpen: boolean
  onClose: () => void
  actionId: string | null
}

const TakeAction: React.FC<TakeActionProps> = ({ isOpen, onClose, actionId }) => {
  const [action, setAction] = useState<ActionDocument | FirestoreAction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && actionId) {
      loadActionData()
    }
  }, [isOpen, actionId])

  useEffect(() => {
    // Reset selected options when modal opens/closes or action changes
    if (isOpen) {
      setSelectedOptions([])
    }
  }, [isOpen, actionId])

  const loadActionData = async () => {
    if (!actionId || !auth.currentUser) return

    setLoading(true)
    setError(null)

    try {
      const actionDoc = await getDoc(doc(db, "quickActions", auth.currentUser.uid, "actions", actionId))

      if (actionDoc.exists()) {
        setAction(actionDoc.data() as ActionDocument | FirestoreAction)
      } else {
        setError("Action not found")
      }
    } catch (err) {
      console.error("Error loading action data:", err)
      setError("Failed to load action details")
    } finally {
      setLoading(false)
    }
  }

  const handleOptionToggle = (option: string) => {
    setSelectedOptions((prev) => {
      if (prev.includes(option)) {
        return prev.filter((opt) => opt !== option)
      } else {
        return [...prev, option]
      }
    })
  }

  const handleConfirm = async () => {
    if (!action || !auth.currentUser) return

    try {
      // Here you can add logic to mark the action as completed
      // and save the selected options if applicable
      const confirmData = {
        actionId: 'actionId' in action ? action.actionId : actionId,
        completed: true,
        ...(isCurrentSchema(action) && action.canPickOptions &&
          selectedOptions.length > 0 && {
            selectedOptions: selectedOptions,
          }),
      }

      console.log("Action confirmed:", confirmData)

      // await updateDoc(doc(db, "quickActions", auth.currentUser.uid, "actions", actionId), {
      //   completed: true,
      //   selectedOptions: isCurrentSchema(action) && action.canPickOptions ? selectedOptions : undefined
      // })

      onClose()
    } catch (err) {
      console.error("Error confirming action:", err)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""
    try {
      return timestamp.toDate().toLocaleDateString()
    } catch {
      return ""
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Action Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-gray-600">Loading action details...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-2">⚠️</div>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : action ? (
            <div className="space-y-6">
              {/* Title Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Title:</h3>
                <p className="text-gray-700">
                  {isNewSchema(action) ? generateActionDisplay(action).title : action.title}
                </p>
              </div>

              {/* Details Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Details:</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {isNewSchema(action) ? generateActionDisplay(action).details : (action.details || "No additional details available")}
                  </p>
                </div>
              </div>

              {/* Summary Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary:</h3>
                <p className="text-gray-600">
                  {isNewSchema(action) ? generateActionDisplay(action).summary : (action.summary || "No summary available")}
                </p>
              </div>

              {/* Product Context - Only for new schema with product info */}
              {isNewSchema(action) && action.product_name && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Product:</h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-blue-900 font-medium">{action.product_name}</p>
                    {action.product_description && (
                      <p className="text-blue-700 text-sm mt-1">{action.product_description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Options Section - Only show if canPickOptions is true (current schema only) */}
              {isCurrentSchema(action) && action.canPickOptions && action.options && action.options.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Options:</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {action.options.map((option, index) => (
                      <label
                        key={index}
                        className="flex items-start gap-3 cursor-pointer hover:bg-white rounded-lg p-2 transition-colors duration-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedOptions.includes(option)}
                          onChange={() => handleOptionToggle(option)}
                          className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-0.5"
                        />
                        <span className="text-gray-700 flex-1">{option}</span>
                      </label>
                    ))}
                  </div>
                  {selectedOptions.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">
                        Selected: {selectedOptions.length} option{selectedOptions.length !== 1 ? "s" : ""}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedOptions.map((option, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendation Section */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Recommendation</h4>
                <p className="text-blue-700 text-sm">
                  Completing this action will help improve your product alignment score and increase market relevance.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !action || (isCurrentSchema(action) && action.canPickOptions && selectedOptions.length === 0)}
              className="px-8 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
          {action && isCurrentSchema(action) && action.canPickOptions && selectedOptions.length === 0 && (
            <p className="text-sm text-gray-500 mt-2 text-center">Please select at least one option to continue</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default TakeAction
