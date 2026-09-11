import React, { useState } from 'react';
import {
  FileCheck,
  ListChecks,
  CheckCircle,
  AlertTriangle,
  Clock,
  Edit2,
  Plus,
  ArrowRight,
  Filter,
  Check,
  X,
  Upload,
  Layers,
  Info,
} from 'lucide-react';
import { Tender, TenderRequirement } from '../../types';

interface TenderChecklistAIProps {
  tender: Tender;
  requirements: TenderRequirement[];
  onUpdateRequirement: (id: string, updates: Partial<TenderRequirement>) => void;
  onNavigateToBidders: () => void;
}

export const TenderChecklistAI: React.FC<TenderChecklistAIProps> = ({
  tender,
  requirements,
  onUpdateRequirement,
  onNavigateToBidders,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [editingRequirement, setEditingRequirement] = useState<TenderRequirement | null>(null);
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  const categories = ['ALL', 'Financial', 'Technical / Experience', 'Statutory', 'Authorization', 'Integrity / Debarment'];

  const filteredRequirements =
    selectedCategory === 'ALL'
      ? requirements
      : requirements.filter((r) => r.category === selectedCategory);

  const pendingConfirmations = requirements.filter((r) => !r.officerConfirmed).length;

  const handleSimulateNewUpload = () => {
    setIsSimulatingUpload(true);
    setTimeout(() => {
      setIsSimulatingUpload(false);
      setUploadSuccessMessage('Tender Document "CPCL-PUMP-NIT-2026-REV2.pdf" analyzed: 14 statutory & technical clauses mapped.');
      setTimeout(() => setUploadSuccessMessage(null), 4000);
    }, 1200);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRequirement) {
      onUpdateRequirement(editingRequirement.id, {
        requirement: editingRequirement.requirement,
        evidenceRequired: editingRequirement.evidenceRequired,
        isMandatory: editingRequirement.isMandatory,
        verificationMethod: editingRequirement.verificationMethod,
        officerConfirmed: true,
        remarks: editingRequirement.remarks,
      });
      setEditingRequirement(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1 font-medium">
            <span>Tenders</span>
            <span>/</span>
            <span className="font-mono font-semibold text-slate-700">{tender.id}</span>
            <span>/</span>
            <span className="text-[#0F766E] font-semibold">Requirement Extraction Matrix</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-[28px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-tight">
              NIT Requirement Extraction Matrix
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-300">
              <FileCheck className="w-3.5 h-3.5 mr-1 text-teal-700" />
              Automated Clause Parser Active
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1 font-normal leading-relaxed">
            Converts unstructured tender Notice Inviting Tender (NIT) PDFs into structured, verifiable compliance matrices.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSimulateNewUpload}
            disabled={isSimulatingUpload}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>{isSimulatingUpload ? 'Parsing Tender Doc...' : 'Re-parse Tender PDF'}</span>
          </button>
          <button
            onClick={onNavigateToBidders}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-md bg-[#102A43] text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <span>Proceed to Bidder Verification</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {uploadSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md text-emerald-900 text-sm flex items-center justify-between font-medium">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{uploadSuccessMessage}</span>
          </div>
          <button onClick={() => setUploadSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Extraction Status Banner */}
      <div className="bg-[#102A43] text-white p-5 rounded-md shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded border border-teal-600/50">
              Extraction Pipeline Complete
            </span>
            <span className="text-xs text-slate-300 font-mono">
              Tender: {tender.id}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            {tender.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300 pt-1 font-normal">
            <span>Department: <strong className="text-white font-medium">{tender.department}</strong></span>
            <span>•</span>
            <span>Bid Deadline: <strong className="text-white font-medium">{tender.deadline}</strong></span>
            <span>•</span>
            <span>Estimated Value: <strong className="text-white font-medium">{tender.estimatedValue}</strong></span>
          </div>
        </div>

        {/* Human in the loop confirmation pill */}
        <div className="flex flex-row md:flex-col items-start md:items-end justify-between border-t md:border-t-0 md:border-l border-slate-700/80 pt-3 md:pt-0 md:pl-6 shrink-0 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-teal-300">{requirements.length}</span>
            <span className="text-xs text-slate-300 font-medium">Requirements Extracted</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-500/40 px-2.5 py-1 rounded">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{pendingConfirmations} Require Officer Confirmation</span>
          </div>
          <div className="text-xs text-slate-400 font-normal">Human-in-the-loop validation enabled</div>
        </div>
      </div>

      {/* Category Filter Pills & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-md border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#102A43] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-800">{filteredRequirements.length}</span> of {requirements.length} clauses
        </div>
      </div>

      {/* Requirements Table */}
      <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3 w-16">Clause</th>
                <th className="py-3 px-4 min-w-[280px]">Requirement & Criterion</th>
                <th className="py-3 px-3 min-w-[180px]">Evidence Required</th>
                <th className="py-3 px-3 w-24 text-center">Mandatory</th>
                <th className="py-3 px-3 min-w-[180px]">Verification Method</th>
                <th className="py-3 px-3 w-32">Automated Check Status</th>
                <th className="py-3 px-3 w-28 text-center">Officer State</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequirements.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-3 font-mono font-semibold text-slate-900 text-xs">
                    {req.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900 text-sm">{req.requirement}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Category: {req.category}
                      </span>
                      {req.remarks && (
                        <span className="text-xs text-amber-700 italic truncate max-w-xs font-normal">
                          {req.remarks}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-700 text-sm font-normal">
                    <div className="line-clamp-2">{req.evidenceRequired}</div>
                    {req.evidenceSource && (
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        Ref: {req.evidenceSource}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {req.isMandatory ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                        YES
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        NO (Exempt)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 text-sm">
                    <span className="font-medium text-slate-800">{req.verificationMethod}</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        req.status === 'PASS'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : req.status === 'REVIEW REQUIRED'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {req.status === 'PASS' && <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />}
                      {req.status === 'REVIEW REQUIRED' && <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />}
                      {req.status === 'PENDING' && <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />}
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {req.officerConfirmed ? (
                      <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3.5 h-3.5 mr-0.5" />
                        Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditingRequirement({ ...req })}
                      className="inline-flex items-center space-x-1 text-xs font-medium text-[#0F766E] hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md border border-teal-200 transition-colors"
                      title="Edit or adjust extracted requirement"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Requirement Modal */}
      {editingRequirement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#102A43] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-teal-300" />
                <h3 className="text-sm font-bold">Edit Tender Requirement {editingRequirement.id}</h3>
              </div>
              <button
                onClick={() => setEditingRequirement(null)}
                className="text-slate-300 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Requirement Clause
                </label>
                <textarea
                  rows={3}
                  value={editingRequirement.requirement}
                  onChange={(e) =>
                    setEditingRequirement({ ...editingRequirement, requirement: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Evidence Required
                </label>
                <input
                  type="text"
                  value={editingRequirement.evidenceRequired}
                  onChange={(e) =>
                    setEditingRequirement({ ...editingRequirement, evidenceRequired: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Is Mandatory
                  </label>
                  <select
                    value={editingRequirement.isMandatory ? 'YES' : 'NO'}
                    onChange={(e) =>
                      setEditingRequirement({
                        ...editingRequirement,
                        isMandatory: e.target.value === 'YES',
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-white"
                  >
                    <option value="YES">YES (Mandatory)</option>
                    <option value="NO">NO (Optional / Exempt)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Verification Method
                  </label>
                  <input
                    type="text"
                    value={editingRequirement.verificationMethod}
                    onChange={(e) =>
                      setEditingRequirement({
                        ...editingRequirement,
                        verificationMethod: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Procurement Officer Annotations / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g., Confirmed with NIT clause 14.2..."
                  value={editingRequirement.remarks || ''}
                  onChange={(e) =>
                    setEditingRequirement({ ...editingRequirement, remarks: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded text-slate-800"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Saving this manual edit will flag the requirement as <strong>Officer Confirmed</strong> and register
                  the adjustment in the immutable audit log.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRequirement(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0F766E] hover:bg-teal-800 text-white rounded font-semibold shadow-xs"
                >
                  Save & Confirm Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
