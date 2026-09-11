import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Upload,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Search,
  ListChecks,
  FileSearch,
  X,
} from 'lucide-react';
import { Tender } from '../../types';

interface TendersViewProps {
  tenders: Tender[];
  onSelectTender: (id: string) => void;
  onOpenExtraction: (id: string) => void;
  onCreateTender: (newTender: any) => void;
}

export const TendersView: React.FC<TendersViewProps> = ({
  tenders,
  onSelectTender,
  onOpenExtraction,
  onCreateTender,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // New tender form state
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('Mechanical Procurement Division — Manali Refinery');
  const [newDeadline, setNewDeadline] = useState('31 Oct 2026, 17:00 IST');
  const [newValue, setNewValue] = useState('₹25.00 Cr');
  const [newDesc, setNewDesc] = useState('');

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const filtered = tenders.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const generatedId = `CPCL/PROC/2026/${Math.floor(60 + Math.random() * 40)}`;
    onCreateTender({
      id: generatedId,
      title: newTitle,
      department: newDept,
      deadline: newDeadline,
      estimatedValue: newValue,
      description: newDesc || 'Procurement initiated under CPCL e-Tendering portal guidelines.',
      requirementsCount: 14,
    });
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) return;
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setIsUploadModalOpen(false);
      onOpenExtraction('CPCL/PROC/2026/047');
    }, 1200);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1 font-medium">
            <span>Procurement Management</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Active Tenders</span>
          </div>
          <h1 className="text-[28px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-tight">
            Tender Portfolio Management
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-normal leading-relaxed">
            Manage Notice Inviting Tenders (NIT), monitor bidder submissions, and run automated requirement extractions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Upload Tender Document</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-md bg-[#102A43] text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-teal-400" />
            <span>Create Tender</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-md border border-slate-200 shadow-xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by tender ID, title, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-800">{filtered.length}</span> active tenders
        </div>
      </div>

      {/* Tenders Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((tender) => (
          <div
            key={tender.id}
            className="bg-white rounded-md border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group"
          >
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-semibold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {tender.id}
                  </span>
                  <div className="text-xs text-slate-400 mt-1 font-mono">Extracted: {tender.extractedDate}</div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                    tender.overallStatus === 'Compliant'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {tender.overallStatus}
                </span>
              </div>

              <h2 className="text-base font-semibold text-slate-900 group-hover:text-[#0F766E] transition-colors leading-snug">
                {tender.title}
              </h2>

              <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed font-normal">
                {tender.description}
              </p>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">Department:</span>
                  <span className="font-medium text-slate-800 text-right truncate max-w-[180px]">
                    {tender.department}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">Estimated Value:</span>
                  <span className="font-semibold text-slate-900">{tender.estimatedValue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">Submission Deadline:</span>
                  <span className="font-medium text-slate-800">{tender.deadline}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">Bidders Submitted:</span>
                  <span className="font-semibold text-slate-900">
                    {tender.biddersCount} bids ({tender.verifiedCount} verified)
                  </span>
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => onOpenExtraction(tender.id)}
                className="inline-flex items-center space-x-1.5 text-xs font-medium text-[#0F766E] hover:text-teal-900"
              >
                <ListChecks className="w-3.5 h-3.5 text-teal-600" />
                <span>Requirements Checklist ({tender.requirementsCount})</span>
              </button>

              <button
                onClick={() => onSelectTender(tender.id)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-white bg-[#102A43] hover:bg-slate-800 rounded-md transition-colors shadow-xs"
              >
                <span>View Bidders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Tender Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#102A43] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Create New Procurement Tender</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Tender Title / Scope of Work
                </label>
                <input
                  type="text"
                  placeholder="e.g. Supply of High-Pressure Seamless Alloy Pipes..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-white"
                  >
                    <option value="Mechanical Procurement Division — Manali Refinery">Mechanical Procurement</option>
                    <option value="Process Chemistry & Catalysts Cell">Process Chemistry</option>
                    <option value="Electrical & Instrumentation Division">Electrical & Instrumentation</option>
                    <option value="Civil & Structural Maintenance">Civil Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Estimated Value
                  </label>
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Bid Deadline
                </label>
                <input
                  type="text"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Detailed Description / Specifications
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter procurement scope..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#102A43] hover:bg-slate-800 text-white rounded font-semibold shadow-xs"
                >
                  Create Tender
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Tender Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#102A43] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Upload Tender Document (NIT PDF)</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Upload the official Notice Inviting Tender (NIT) or technical specifications document.
                The extraction engine parses clauses, identifies eligibility thresholds, and generates a structured compliance matrix.
              </p>

              <div className="border-2 border-dashed border-slate-300 rounded-md p-6 text-center hover:border-teal-500 cursor-pointer transition-colors bg-slate-50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="font-semibold text-slate-700">
                  {uploadedFile ? uploadedFile.name : 'Click to select or drag NIT PDF'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">PDF, DOCX up to 50MB</div>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="tender-doc-file"
                />
                <label
                  htmlFor="tender-doc-file"
                  className="mt-3 inline-block px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Browse Document
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadedFile || isUploading}
                  className="px-4 py-1.5 bg-[#0F766E] hover:bg-teal-800 disabled:opacity-50 text-white rounded font-semibold shadow-xs flex items-center space-x-1.5"
                >
                  <FileSearch className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Extracting Requirements...' : 'Extract NIT Requirements'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
