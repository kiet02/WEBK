/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ParsedGameProject,
  TranslatableSegment,
  AIServiceConfig,
  GlossaryItem,
  AIProvider,
  TranslationTone,
  SAMPLE_PROJECTS,
  parseGameProject,
  translateSegmentsBatch,
  generatePatchZip,
  exportTranslatedPatch,
  buildAIEnginePrompt,
  checkWebGPUSupport,
  loadWebGPUModel,
  SUPPORTED_WEBGPU_MODELS,
  WebGPUStatus,
  WebGPUModelProgress,
  checkPythonEngineStatus,
  runPythonBenchmark,
  PythonEngineStatus,
  maskGameTags,
  unmaskGameTags,
  translateViaWebFree,
  SpeakerPersona,
  analyzeProjectSpeakers,
  hasPronounMismatch,
  autoFixPronouns,
} from '@/lib/game-translator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PronounHighlightedText } from './PronounHighlightedText';

export function GameTranslatorStudio() {
  // Current active game project
  const [project, setProject] = useState<ParsedGameProject>(() => {
    const defaultSample = SAMPLE_PROJECTS[0];
    return parseGameProject(
      defaultSample.name,
      defaultSample.files.map((f) => ({
        name: f.path,
        path: f.path,
        content: f.content,
        size: f.content.length,
      }))
    );
  });

  // Segments & Personas state
  const [segments, setSegments] = useState<TranslatableSegment[]>(project.segments);
  const [personas, setPersonas] = useState<SpeakerPersona[]>(project.personas || []);

  // Sync segments and personas when project changes
  useEffect(() => {
    setSegments(project.segments);
    setPersonas(project.personas || []);
  }, [project]);

  // AI & Translation settings
  const [aiConfig, setAiConfig] = useState<AIServiceConfig>({
    provider: 'web_free',
    apiKey: '',
    model: 'gemini-1.5-flash',
    sourceLang: 'en',
    targetLang: 'vi',
    tone: 'fantasy_rpg',
    personas: project.personas || [],
    glossary: [
      { id: '1', term: 'Eldoria', translation: 'Eldoria', category: 'location' },
      { id: '2', term: 'Hero', translation: 'Dũng sĩ', category: 'character' },
      { id: '3', term: 'Gold', translation: 'Vàng', category: 'item' },
    ],
  });

  // Sync personas into aiConfig
  useEffect(() => {
    setAiConfig((prev) => ({
      ...prev,
      personas,
    }));
  }, [personas]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'untranslated' | 'translated' | 'reviewed'>('all');
  const [fileFilter, setFileFilter] = useState<string>('all');
  const [highlightPronounsEnabled, setHighlightPronounsEnabled] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Reset pagination to page 1 whenever filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, fileFilter, project.id]);

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [showAiInspectorModal, setShowAiInspectorModal] = useState(false);
  const [showPersonasModal, setShowPersonasModal] = useState(false);
  const [isAnalyzingPersonas, setIsAnalyzingPersonas] = useState(false);
  const [newGlossaryTerm, setNewGlossaryTerm] = useState({ term: '', translation: '', category: 'general' as GlossaryItem['category'] });
  const [newPersona, setNewPersona] = useState<SpeakerPersona>({
    speaker: '',
    role: '',
    gender: 'neutral',
    ageGroup: 'adult',
    firstPerson: 'Tôi',
    secondPerson: 'Bạn',
    relationship: '',
    toneInstruction: '',
  });

  // Analyze characters & pronouns using AI (with instant heuristic fallback)
  const handleAnalyzePersonasWithAI = async () => {
    setIsAnalyzingPersonas(true);
    try {
      const analyzed = await analyzeProjectSpeakers(segments, aiConfig);
      setPersonas(analyzed);
      setProject((prev) => ({ ...prev, personas: analyzed }));
    } catch (err) {
      console.error('Lỗi khi phân tích nhân vật:', err);
    } finally {
      setIsAnalyzingPersonas(false);
    }
  };

  // Add custom character persona
  const handleAddCustomPersona = () => {
    if (!newPersona.speaker.trim()) return;
    setPersonas((prev) => {
      const filtered = prev.filter(
        (p) => p.speaker.toLowerCase() !== newPersona.speaker.trim().toLowerCase()
      );
      return [
        ...filtered,
        {
          ...newPersona,
          speaker: newPersona.speaker.trim(),
          role: newPersona.role.trim() || 'Nhân vật phụ',
        },
      ];
    });
    setNewPersona({
      speaker: '',
      role: '',
      gender: 'neutral',
      ageGroup: 'adult',
      firstPerson: 'Tôi',
      secondPerson: 'Bạn',
      relationship: '',
      toneInstruction: '',
    });
  };

  // Update single field of persona
  const handleUpdatePersonaField = (
    speaker: string,
    field: keyof SpeakerPersona,
    value: string
  ) => {
    setPersonas((prev) =>
      prev.map((p) => (p.speaker === speaker ? { ...p, [field]: value } : p))
    );
  };

  // Delete persona
  const handleDeletePersona = (speaker: string) => {
    setPersonas((prev) => prev.filter((p) => p.speaker !== speaker));
  };

  // WebGPU state
  const [webgpuStatus, setWebgpuStatus] = useState<WebGPUStatus | null>(null);
  const [webgpuProgress, setWebgpuProgress] = useState<WebGPUModelProgress | null>(null);
  const [isLoadingWebGPU, setIsLoadingWebGPU] = useState(false);

  // Python Engine state
  const [pythonStatus, setPythonStatus] = useState<PythonEngineStatus | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    throughput: number;
    durationMs: number;
    workers: number;
    hardware: string;
  } | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  useEffect(() => {
    checkWebGPUSupport().then(setWebgpuStatus);
    checkPythonEngineStatus().then(setPythonStatus);
  }, []);

  const handlePreloadWebGPU = async () => {
    setIsLoadingWebGPU(true);
    try {
      await loadWebGPUModel(aiConfig.model || 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', (prog) => {
        setWebgpuProgress(prog);
      });
    } catch (err) {
      console.error('Lỗi khi nạp mô hình WebGPU:', err);
    } finally {
      setIsLoadingWebGPU(false);
    }
  };

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const res = await runPythonBenchmark(50);
      setBenchmarkResult(res);
    } catch (err) {
      console.error('Lỗi chạy benchmark:', err);
    } finally {
      setIsBenchmarking(false);
    }
  };

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Filtered segments
  const filteredSegments = useMemo(() => {
    return segments.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (fileFilter !== 'all' && s.file !== fileFilter) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesOriginal = s.original.toLowerCase().includes(q);
        const matchesTrans = s.translation.toLowerCase().includes(q);
        const matchesSpeaker = s.speaker?.toLowerCase().includes(q) ?? false;
        if (!matchesOriginal && !matchesTrans && !matchesSpeaker) return false;
      }
      return true;
    });
  }, [segments, statusFilter, fileFilter, searchQuery]);

  // Tab pagination (20 sentences per tab)
  const totalPages = Math.max(1, Math.ceil(filteredSegments.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredSegments.length);
  const currentTabSegments = useMemo(() => {
    return filteredSegments.slice(startIndex, endIndex);
  }, [filteredSegments, startIndex, endIndex]);

  // Statistics
  const stats = useMemo(() => {
    const total = segments.length;
    const translated = segments.filter((s) => s.status === 'translated' || s.status === 'reviewed').length;
    const reviewed = segments.filter((s) => s.status === 'reviewed').length;
    const untranslated = total - translated;
    const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;
    const totalTags = segments.reduce((acc, s) => acc + s.tags.length, 0);
    const dirtyCount = segments.filter((s) => {
      if (!s.translation || s.status === 'untranslated') return false;
      const ratio = (s.translation.length / Math.max(1, s.original.length)) * 100;
      const missingTag = s.tags.some((t) => !s.translation.includes(t));
      const hasChatter = /(?:là một hành động|là khái niệm|có nghĩa là|được hiểu là)/i.test(s.translation);
      const hasChinese = /[\u4e00-\u9fff]/.test(s.translation);
      return (ratio > 160 && s.translation.length > 30) || missingTag || hasChatter || hasChinese;
    }).length;

    const pronounMismatchCount = segments.filter((s) => {
      if (!s.translation || s.status === 'untranslated' || !s.speaker) return false;
      const p = personas.find(
        (item) => item.speaker.toLowerCase() === s.speaker?.toLowerCase()
      );
      return hasPronounMismatch(s.translation, p);
    }).length;

    return { total, translated, reviewed, untranslated, percentage, totalTags, dirtyCount, pronounMismatchCount };
  }, [segments, personas]);

  // Load a built-in demo project
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_PROJECTS.find((p) => p.id === sampleId);
    if (!sample) return;

    const parsed = parseGameProject(
      sample.name,
      sample.files.map((f) => ({
        name: f.path,
        path: f.path,
        content: f.content,
        size: f.content.length,
      }))
    );
    setProject(parsed);
  };

  // Handle uploaded files
  const handleFilesUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const loadedFiles: { name: string; path: string; content: string; size: number }[] = [];
    const filesArray = Array.from(fileList);

    for (const f of filesArray) {
      // Relative path if from folder upload
      const path = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name;
      try {
        const text = await f.text();
        loadedFiles.push({
          name: f.name,
          path,
          content: text,
          size: f.size,
        });
      } catch (err) {
        console.error('Cannot read file:', f.name, err);
      }
    }

    if (loadedFiles.length > 0) {
      const projectName = loadedFiles[0].path.split('/')[0] || 'Custom Game Project';
      const parsed = parseGameProject(projectName, loadedFiles);
      setProject(parsed);
    }
  };

  // Run AI translation for all or filtered segments
  const handleBatchTranslate = async (onlyUntranslated = true) => {
    const targets = onlyUntranslated
      ? segments.filter((s) => s.status === 'untranslated')
      : segments;

    if (targets.length === 0) return;

    setIsTranslating(true);
    setProgress({ completed: 0, total: targets.length });

    try {
      const updatedTargets = await translateSegmentsBatch(targets, aiConfig, (completed, total) => {
        setProgress({ completed, total });
      });

      const targetMap = new Map<string, TranslatableSegment>(updatedTargets.map((t) => [t.id, t]));
      setSegments((prev) =>
        prev.map((s) => targetMap.get(s.id) || s)
      );
    } finally {
      setIsTranslating(false);
      setProgress(null);
    }
  };

  // Translate only untranslated segments in current tab (20 sentences)
  const handleTranslateCurrentTab = async () => {
    const targets = currentTabSegments.filter((s) => s.status === 'untranslated');
    if (targets.length === 0) return;

    setIsTranslating(true);
    setProgress({ completed: 0, total: targets.length });

    try {
      const updatedTargets = await translateSegmentsBatch(targets, aiConfig, (completed, total) => {
        setProgress({ completed, total });
      });

      const targetMap = new Map<string, TranslatableSegment>(updatedTargets.map((t) => [t.id, t]));
      setSegments((prev) => prev.map((s) => targetMap.get(s.id) || s));
    } finally {
      setIsTranslating(false);
      setProgress(null);
    }
  };

  // Auto-fix pronouns for all segments in current tab
  const handleAutoFixPronounsCurrentTab = () => {
    const tabIds = new Set(currentTabSegments.map((s) => s.id));
    setSegments((prev) =>
      prev.map((s) => {
        if (!tabIds.has(s.id)) return s;
        const persona = personas.find(
          (p) => p.speaker.toLowerCase() === s.speaker?.toLowerCase()
        );
        if (!persona) return s;
        const fixed = autoFixPronouns(s.translation, persona);
        return fixed !== s.translation ? { ...s, translation: fixed } : s;
      })
    );
  };

  // Translate a single segment
  const handleTranslateSingle = async (segId: string) => {
    const seg = segments.find((s) => s.id === segId);
    if (!seg) return;

    const [updated] = await translateSegmentsBatch([seg], aiConfig);
    setSegments((prev) => prev.map((s) => (s.id === segId ? updated : s)));
  };

  // One-click clean single segment from hallucinations or chatty explanations
  const handleCleanSingle = async (segId: string) => {
    const seg = segments.find((s) => s.id === segId);
    if (!seg) return;
    const { maskedText, tokens } = maskGameTags(seg.original);
    const cleanMasked = await translateViaWebFree(maskedText, aiConfig.targetLang);
    const restored = unmaskGameTags(cleanMasked, tokens);
    handleUpdateTranslation(segId, restored);
  };

  // Clean all dirty or hallucinated segments across project
  const handleCleanAllDirty = async () => {
    const dirtySegs = segments.filter((s) => {
      if (!s.translation || s.status === 'untranslated') return false;
      const ratio = (s.translation.length / Math.max(1, s.original.length)) * 100;
      const missingTag = s.tags.some((t) => !s.translation.includes(t));
      const hasChatter = /(?:là một hành động|là khái niệm|có nghĩa là|được hiểu là)/i.test(s.translation);
      const hasChinese = /[\u4e00-\u9fff]/.test(s.translation);
      return (ratio > 160 && s.translation.length > 30) || missingTag || hasChatter || hasChinese;
    });

    if (dirtySegs.length === 0) return;

    setIsTranslating(true);
    try {
      const cleaned = await Promise.all(
        dirtySegs.map(async (seg) => {
          const { maskedText, tokens } = maskGameTags(seg.original);
          const cleanMasked = await translateViaWebFree(maskedText, aiConfig.targetLang);
          return {
            ...seg,
            translation: unmaskGameTags(cleanMasked, tokens),
            status: 'translated' as const,
          };
        })
      );
      const cleanMap = new Map(cleaned.map((c) => [c.id, c]));
      setSegments((prev) => prev.map((s) => cleanMap.get(s.id) || s));
    } finally {
      setIsTranslating(false);
    }
  };

  // Update translation for single segment
  const handleUpdateTranslation = (segId: string, val: string) => {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === segId
          ? {
            ...s,
            translation: val,
            status: val.trim().length > 0 ? (s.status === 'reviewed' ? 'reviewed' : 'translated') : 'untranslated',
          }
          : s
      )
    );
  };

  // Toggle status (e.g. mark reviewed)
  const handleToggleReviewed = (segId: string) => {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === segId
          ? { ...s, status: s.status === 'reviewed' ? 'translated' : 'reviewed' }
          : s
      )
    );
  };

  // Auto-fix pronouns for a single segment
  const handleAutoFixPronounSingle = (segId: string) => {
    setSegments((prev) =>
      prev.map((s) => {
        if (s.id !== segId || !s.speaker) return s;
        const p = personas.find(
          (item) => item.speaker.toLowerCase() === s.speaker?.toLowerCase()
        );
        if (!p) return s;
        const fixed = autoFixPronouns(s.translation, p);
        return {
          ...s,
          translation: fixed,
          status: fixed.trim().length > 0 ? (s.status === 'reviewed' ? 'reviewed' : 'translated') : 'untranslated',
        };
      })
    );
  };

  // Auto-fix pronouns for all segments in project
  const handleAutoFixAllPronouns = () => {
    setSegments((prev) =>
      prev.map((s) => {
        if (!s.translation || !s.speaker) return s;
        const p = personas.find(
          (item) => item.speaker.toLowerCase() === s.speaker?.toLowerCase()
        );
        if (!p) return s;
        const fixed = autoFixPronouns(s.translation, p);
        return {
          ...s,
          translation: fixed,
        };
      })
    );
  };

  // Download complete game patch as ZIP
  const handleDownloadPatchZip = () => {
    const zipBytes = generatePatchZip(project, segments);
    const blob = new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_vietnamese_patch.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download individual file
  const handleDownloadSingleFile = (filePath: string) => {
    const exported = exportTranslatedPatch(project, segments);
    const target = exported.find((f) => f.path === filePath);
    if (!target) return;

    const blob = new Blob([target.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = target.path.split('/').pop() || 'translated_file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Add new glossary term
  const handleAddGlossaryTerm = () => {
    if (!newGlossaryTerm.term.trim() || !newGlossaryTerm.translation.trim()) return;
    setAiConfig((prev) => ({
      ...prev,
      glossary: [
        ...prev.glossary,
        {
          id: String(Date.now()),
          term: newGlossaryTerm.term.trim(),
          translation: newGlossaryTerm.translation.trim(),
          category: newGlossaryTerm.category,
        },
      ],
    }));
    setNewGlossaryTerm({ term: '', translation: '', category: 'general' });
  };

  // Quick add term from segment
  const handleQuickAddGlossary = (text: string) => {
    setNewGlossaryTerm((prev) => ({ ...prev, term: text }));
    setShowGlossaryModal(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* 1. Top Engine Status Banner */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-linear-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-indigo-500/20 shrink-0">
              🎮
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                  GameLingo AI Studio
                </h1>
                <Badge variant="default" size="md">
                  {project.engine.name}
                </Badge>
                <Badge variant={project.engine.confidence > 0.8 ? 'success' : 'warning'} size="sm" dot>
                  Độ tin cậy: {Math.round(project.engine.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                {project.engine.reason} • {project.files.length} tệp được xử lý
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGlossaryModal(true)}
              className="text-xs"
            >
              📖 Bảng Thuật Ngữ ({aiConfig.glossary.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPersonasModal(true)}
              className="text-xs text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/80 hover:bg-violet-50 dark:hover:bg-violet-950/40"
            >
              🎭 Đại Từ & Nhân Vật ({personas.length})
            </Button>
            {pythonStatus?.online && (
              <Badge variant="success" size="sm" dot>
                Python Engine ({pythonStatus.activeWorkers} luồng)
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(true)}
              className="text-xs"
            >
              ⚙️ Cấu Hình AI ({aiConfig.provider === 'python_local' ? '🚀 PYTHON' : aiConfig.provider === 'webgpu' ? '⚡ WEBGPU' : aiConfig.provider === 'web_free' ? 'GOOGLE WEB' : aiConfig.provider.toUpperCase()})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAiInspectorModal(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60"
            >
              🧠 AI Nhận Diện Cấu Trúc
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Project Selector & File Uploader Bar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Sample Loaders */}
        <div className="xl:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Dự Án Mẫu Có Sẵn (1-Click Test)
            </div>
            {/* Quick Download Sample Files */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap">
              <span className="font-medium text-zinc-600 dark:text-zinc-300">Tải tệp JSON test:</span>
              <a
                href="/samples/Map002_100_dialogues.json"
                download="Map002_100_dialogues.json"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                title="Tải tệp Map002 chứa 100 câu thoại kiểm thử đại từ xưng hô"
              >
                Map002 (100 câu)
              </a>
              <span>·</span>
              <a
                href="/samples/Actors_sample.json"
                download="Actors.json"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                title="Tải tệp hồ sơ 13 nhân vật"
              >
                Actors
              </a>
              <span>·</span>
              <a
                href="/samples/Items_sample.json"
                download="Items.json"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                title="Tải tệp vật phẩm & thẻ màu"
              >
                Items
              </a>
              <span>·</span>
              <a
                href="/samples/Map001_sample.json"
                download="Map001.json"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                title="Tải tệp sự kiện Map001"
              >
                Map001
              </a>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {SAMPLE_PROJECTS.map((sp) => {
              const isActive = project.name === sp.name;
              return (
                <button
                  key={sp.id}
                  onClick={() => handleLoadSample(sp.id)}
                  className={`text-left p-3 rounded-lg border text-xs transition-all ${isActive
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 font-medium text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{sp.badge}</span>
                    {isActive && <span className="text-indigo-500">✓</span>}
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-1 line-clamp-1">
                    {sp.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Custom Game Folder / Files */}
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 flex flex-col justify-center items-center text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFilesUpload(e.target.files)}
            multiple
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            onChange={(e) => handleFilesUpload(e.target.files)}
            // @ts-expect-error webkitdirectory is standard in HTML5 browsers
            webkitdirectory=""
            directory=""
            className="hidden"
          />

          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            Nạp Game Của Bạn
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 mb-2.5">
            JSON (RPGM), RPY (Ren&apos;Py), TXT/CSV (Unity)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => folderInputRef.current?.click()}
              className="text-xs"
            >
              📁 Chọn Thư Mục
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              📄 Chọn Tệp
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Metrics & Batch Translate Action Bar */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Progress & Counts */}
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Tiến độ dịch</div>
              <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>{stats.percentage}%</span>
                <span className="text-xs font-normal text-zinc-400">
                  ({stats.translated}/{stats.total} câu)
                </span>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-zinc-200 dark:bg-zinc-800" />

            <div className="hidden sm:block">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Mã Tag An Toàn</div>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {stats.totalTags} thẻ bảo vệ
              </div>
            </div>

            {stats.pronounMismatchCount > 0 && (
              <>
                <div className="hidden sm:block h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
                <div className="hidden sm:block">
                  <div className="text-xs text-rose-500 dark:text-rose-400 font-medium">Lệch Đại Từ</div>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <span>⚠️ {stats.pronounMismatchCount} câu</span>
                  </div>
                </div>
              </>
            )}

            <div className="hidden sm:block h-8 w-px bg-zinc-200 dark:bg-zinc-800" />

            <div className="hidden md:block">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Phong cách</div>
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
                {aiConfig.tone.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="md"
              disabled={isTranslating || stats.total === 0}
              onClick={() => handleBatchTranslate(true)}
              className="text-xs sm:text-sm font-semibold"
            >
              {isTranslating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Đang dịch ({progress?.completed || 0}/{progress?.total || 0})...
                </>
              ) : (
                <>✨ Dịch Hàng Loạt AI ({stats.untranslated} câu)</>
              )}
            </Button>

            {stats.dirtyCount > 0 && (
              <Button
                variant="outline"
                size="md"
                disabled={isTranslating}
                onClick={handleCleanAllDirty}
                className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs sm:text-sm font-semibold"
              >
                🧹 Dọn Sạch Tràn Khung & Rác ({stats.dirtyCount})
              </Button>
            )}

            {stats.pronounMismatchCount > 0 && (
              <Button
                variant="outline"
                size="md"
                disabled={isTranslating}
                onClick={handleAutoFixAllPronouns}
                className="border-violet-300 dark:border-violet-700 bg-violet-50/70 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 text-xs sm:text-sm font-semibold"
                title="Tự động thay thế các đại từ máy móc (tôi/bạn) theo đúng vai trò nhân vật cho toàn bộ dự án"
              >
                🪄 Khớp Đại Từ Chuẩn ({stats.pronounMismatchCount} câu)
              </Button>
            )}

            <Button
              variant="secondary"
              size="md"
              onClick={handleDownloadPatchZip}
              className="text-xs sm:text-sm font-semibold"
            >
              📦 Tải Gói Bản Vá (.ZIP)
            </Button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full mt-4 overflow-hidden">
          <div
            className="bg-linear-to-r from-indigo-500 to-violet-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      {/* 4. Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Tìm kiếm chuỗi thoại gốc, bản dịch, hoặc nhân vật..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs py-1.5"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            className="text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-zinc-700 dark:text-zinc-300"
          >
            <option value="all">Tất cả tệp ({project.files.length})</option>
            {project.files.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>

          {(['all', 'untranslated', 'translated', 'reviewed'] as const).map((st) => {
            const labels = {
              all: `Tất cả (${stats.total})`,
              untranslated: `Chưa dịch (${stats.untranslated})`,
              translated: `Đã dịch (${stats.translated})`,
              reviewed: `Đã duyệt (${stats.reviewed})`,
            };
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 font-semibold text-indigo-700 dark:text-indigo-300'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
              >
                {labels[st]}
              </button>
            );
          })}

          {/* Pronoun Highlight Mode Toggle */}
          <button
            type="button"
            onClick={() => setHighlightPronounsEnabled(!highlightPronounsEnabled)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 ${highlightPronounsEnabled
              ? 'border-violet-500 bg-violet-50/80 dark:bg-violet-950/70 font-semibold text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/20'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
              }`}
            title="Bật/Tắt chế độ tô màu trực quan các đại từ xưng hô đã chuyển đổi"
          >
            <span>🎨 Tô Màu Đại Từ</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${highlightPronounsEnabled
                ? 'bg-violet-200 dark:bg-violet-900 text-violet-800 dark:text-violet-200'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
            >
              {highlightPronounsEnabled ? 'BẬT' : 'TẮT'}
            </span>
          </button>
        </div>
      </div>

      {/* 5. Tab Pagination Navigation Bar (20 câu / Tab) */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xs flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <span>📑 Phân Tab Hội Thoại</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                20 câu / tab
              </span>
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {filteredSegments.length > 0 ? (
                <>
                  Hiển thị câu <strong>#{startIndex + 1}</strong> – <strong>#{endIndex}</strong> trên tổng số{' '}
                  <strong>{filteredSegments.length}</strong> câu
                </>
              ) : (
                '0 câu'
              )}
            </span>
          </div>

          {/* Quick tab controls */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end flex-wrap">
            {/* Quick translate current tab */}
            {currentTabSegments.some((s) => s.status === 'untranslated') && (
              <button
                type="button"
                onClick={handleTranslateCurrentTab}
                disabled={isTranslating}
                className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Chỉ dịch các câu chưa dịch trong tab hiện tại"
              >
                <span>⚡ Dịch Tab Này ({currentTabSegments.filter((s) => s.status === 'untranslated').length})</span>
              </button>
            )}

            {/* Quick fix pronouns in current tab if any mismatch exists */}
            {currentTabSegments.some((s) => {
              const p = personas.find((item) => item.speaker.toLowerCase() === s.speaker?.toLowerCase());
              return hasPronounMismatch(s.translation, p);
            }) && (
                <button
                  type="button"
                  onClick={handleAutoFixPronounsCurrentTab}
                  className="text-xs px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/60 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                  title="Khớp đại từ cho các câu trong tab hiện tại"
                >
                  <span>🪄 Sửa Đại Từ Tab Này</span>
                </button>
              )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="text-xs px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                title="Về tab trước"
              >
                ◀ Trước
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="text-xs px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                title="Sang tab tiếp theo"
              >
                Sau ▶
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Tab Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin pt-0.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const isSelected = pageNum === safeCurrentPage;
            const tStart = (pageNum - 1) * PAGE_SIZE + 1;
            const tEnd = Math.min(pageNum * PAGE_SIZE, filteredSegments.length);
            const sliceItems = filteredSegments.slice(tStart - 1, tEnd);
            const hasMismatch = sliceItems.some((s) => {
              const p = personas.find((item) => item.speaker.toLowerCase() === s.speaker?.toLowerCase());
              return hasPronounMismatch(s.translation, p);
            });
            const isComplete =
              sliceItems.length > 0 &&
              sliceItems.every((s) => s.status === 'translated' || s.status === 'reviewed');

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all shrink-0 cursor-pointer ${isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800'
                  }`}
              >
                <span>Tab {pageNum}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected
                      ? 'bg-indigo-700/80 text-indigo-100'
                      : 'bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                >
                  {tStart}–{tEnd}
                </span>
                {hasMismatch && (
                  <span
                    className={`text-[10px] font-bold ${isSelected ? 'text-amber-200' : 'text-rose-500'
                      }`}
                    title="Có câu bị lệch đại từ trong tab này"
                  >
                    ⚠️
                  </span>
                )}
                {!hasMismatch && isComplete && (
                  <span
                    className={`text-[10px] font-bold ${isSelected ? 'text-emerald-200' : 'text-emerald-500'
                      }`}
                    title="Đã dịch xong toàn bộ tab này"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Dual-Pane Translation Rows */}
      <div className="flex flex-col gap-3">
        {filteredSegments.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center text-zinc-500 dark:text-zinc-400">
            Không tìm thấy đoạn hội thoại nào phù hợp với bộ lọc.
          </div>
        ) : (
          currentTabSegments.map((seg, idx) => {
            const isChanged = seg.translation.trim().length > 0;
            const lengthRatio =
              seg.original.length > 0
                ? Math.round((seg.translation.length / seg.original.length) * 100)
                : 100;
            const hasLengthWarning = lengthRatio > 160 && seg.translation.length > 30;
            const hasChineseWarning = /[\u4e00-\u9fff]/.test(seg.translation);

            const currentPersona = personas.find(
              (item) => item.speaker.toLowerCase() === seg.speaker?.toLowerCase()
            );
            const hasPronounAlert = hasPronounMismatch(seg.translation, currentPersona);

            return (
              <div
                key={seg.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs"
              >
                {/* Row Meta Header */}
                <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-semibold text-zinc-400">
                      #{startIndex + idx + 1}
                    </span>
                    {seg.speaker && (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" size="sm">
                          🗣️ {seg.speaker}
                        </Badge>
                        {(() => {
                          const p = currentPersona;
                          if (!p || (!p.firstPerson && !p.secondPerson)) return null;
                          return (
                            <button
                              onClick={() => setShowPersonasModal(true)}
                              title={`Vai trò: ${p.role}\nĐại từ: Xưng "${p.firstPerson}" - Gọi "${p.secondPerson}"\nBấm để chỉnh sửa`}
                              className="text-[10px] font-semibold tracking-tight text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/80 border border-violet-200 dark:border-violet-800/60 px-1.5 py-0.5 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span>{p.firstPerson}</span>
                              <span className="text-violet-400">➜</span>
                              <span>{p.secondPerson}</span>
                            </button>
                          );
                        })()}
                      </div>
                    )}
                    {hasPronounAlert && (
                      <div className="flex items-center gap-1">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 cursor-help"
                          title={`Cảnh báo: Bản dịch có chứa đại từ máy móc (tôi/bạn) chưa khớp vai trò ${currentPersona?.role || seg.speaker}!`}
                        >
                          ⚠️ Lệch đại từ
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAutoFixPronounSingle(seg.id)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 hover:bg-violet-200 text-violet-800 dark:bg-violet-950 dark:hover:bg-violet-900 dark:text-violet-200 border border-violet-300 dark:border-violet-700 transition-colors flex items-center gap-1 cursor-pointer"
                          title={`Tự động chuyển đổi sang đại từ chuẩn: "${currentPersona?.firstPerson || ''}" / "${currentPersona?.secondPerson || ''}"`}
                        >
                          <span>🪄 Sửa đại từ</span>
                        </button>
                      </div>
                    )}
                    <span className="text-[11px] font-mono text-zinc-400 truncate max-w-50 sm:max-w-xs">
                      {seg.file}
                    </span>
                    {seg.context && (
                      <span className="hidden md:inline-block text-[11px] text-zinc-400">
                        • {seg.context}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleReviewed(seg.id)}
                      className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${seg.status === 'reviewed'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700'
                        }`}
                    >
                      {seg.status === 'reviewed' ? '✓ Đã Duyệt' : 'Duyệt'}
                    </button>
                    <button
                      onClick={() => handleTranslateSingle(seg.id)}
                      className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-medium"
                    >
                      ⚡ Dịch AI
                    </button>
                  </div>
                </div>

                {/* Grid: Source vs Target */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Source Text & Interactive Tag Badges */}
                  <div className="flex flex-col justify-between rounded-lg bg-zinc-50 dark:bg-zinc-950/50 p-3 border border-zinc-100 dark:border-zinc-800/60">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Nguyên Bản ({seg.original.length} ký tự)
                      </div>
                      <div className="text-sm text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed select-text">
                        {seg.original}
                      </div>
                    </div>

                    {/* Detected Tags Pills */}
                    {seg.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                        <span className="text-[10px] text-zinc-400">Thẻ bảo vệ:</span>
                        {seg.tags.map((tag, tIdx) => (
                          <button
                            key={tIdx}
                            type="button"
                            title="Bấm để chèn thẻ này vào ô dịch"
                            onClick={() => {
                              const newTrans = (seg.translation ? `${seg.translation} ` : '') + tag;
                              handleUpdateTranslation(seg.id, newTrans);
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                          >
                            🛡️ {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Translation Editor & Pronoun Highlighter */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        <span>Bản Dịch</span>
                        {hasChineseWarning ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                              🇨🇳 Lỗi: Chứa chữ Hán/tiếng Trung
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCleanSingle(seg.id)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 font-semibold hover:bg-rose-200 transition-colors"
                              title="Tự động dịch lại sang tiếng Việt chuẩn"
                            >
                              🧹 Dọn sạch
                            </button>
                          </div>
                        ) : hasLengthWarning ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-600 dark:text-amber-400 font-normal">
                              ⚠️ Dài hơn gốc {lengthRatio}% (coi chừng tràn khung thoại)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCleanSingle(seg.id)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold hover:bg-amber-200 transition-colors"
                              title="Tự động thu gọn và dịch lại chuẩn súc tích"
                            >
                              🧹 Dọn sạch
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <textarea
                        value={seg.translation}
                        onChange={(e) => handleUpdateTranslation(seg.id, e.target.value)}
                        placeholder="Nhập bản dịch hoặc bấm 'Dịch AI'..."
                        rows={3}
                        className={`w-full rounded-lg border p-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${hasChineseWarning
                          ? 'border-rose-400 dark:border-rose-700 bg-rose-50/20 dark:bg-rose-950/10 text-zinc-900 dark:text-zinc-100'
                          : hasLengthWarning
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/10 text-zinc-900 dark:text-zinc-100'
                            : hasPronounAlert
                              ? 'border-rose-300 dark:border-rose-800 bg-rose-50/10 dark:bg-rose-950/10 text-zinc-900 dark:text-zinc-100'
                              : isChanged
                                ? 'border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                          }`}
                      />

                      {/* Real-time Pronoun Highlight Inspector */}
                      {highlightPronounsEnabled && seg.translation.trim().length > 0 && (
                        <div className="mt-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 pb-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                                🎨 Soi Đại Từ Đã Chuyển Đổi
                              </span>
                              {currentPersona && (
                                <span className="text-[10px] text-zinc-400 font-normal">
                                  ({currentPersona.speaker}: {currentPersona.firstPerson} ➜ {currentPersona.secondPerson})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 text-[10px] font-normal">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-violet-500 inline-block"></span>
                                <span className="text-violet-700 dark:text-violet-300 font-medium">Xưng (Ngôi 1)</span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span>
                                <span className="text-cyan-700 dark:text-cyan-300 font-medium">Hô (Ngôi 2)</span>
                              </span>
                              {hasPronounAlert && (
                                <button
                                  type="button"
                                  onClick={() => handleAutoFixPronounSingle(seg.id)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer"
                                  title={`Tự động sửa các từ xưng hô máy móc sang chuẩn vai trò "${currentPersona?.firstPerson || ''}" ➜ "${currentPersona?.secondPerson || ''}"`}
                                >
                                  <span>⚠️ Lệch đại từ ➜ 🪄 Sửa ngay</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed font-medium">
                            <PronounHighlightedText text={seg.translation} persona={currentPersona} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                      <span>Độ dài: {seg.translation.length} ký tự</span>
                      <button
                        type="button"
                        onClick={() => handleQuickAddGlossary(seg.original)}
                        className="text-zinc-400 hover:text-indigo-500 transition-colors"
                      >
                        + Thêm từ gốc vào Thuật Ngữ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Pagination Strip */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs shadow-xs">
          <div className="text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
            Đang hiển thị Tab <strong className="text-zinc-800 dark:text-zinc-200">{safeCurrentPage}</strong> / {totalPages}{' '}
            (câu #{startIndex + 1} – #{endIndex} trên tổng số {filteredSegments.length} câu)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 350, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              ◀ Tab trước
            </button>
            <span className="font-mono text-xs font-semibold px-2 text-zinc-600 dark:text-zinc-400">
              {safeCurrentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 350, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              Tab sau ▶
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: AI Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Cài Đặt Dịch Thuật AI
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Cấu hình mô hình ngôn ngữ và phong cách dịch phù hợp với thể loại game.
            </p>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 block">
                  Nhà Cung Cấp AI (Provider)
                </label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => {
                    const newProvider = e.target.value as AIProvider;
                    setAiConfig((prev) => ({
                      ...prev,
                      provider: newProvider,
                      model:
                        newProvider === 'webgpu'
                          ? 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
                          : prev.model,
                    }));
                  }}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs"
                >
                  <option value="web_free">Google Translate Web (Miễn Phí • Dịch Câu Hoàn Chỉnh Tức Thì)</option>
                  <option value="python_local">🚀 Python Accelerator (Đa Luồng Cực Nhanh • Local Backend :8765)</option>
                  <option value="webgpu">⚡ WebGPU Local AI (Chạy Trực Tiếp Bằng GPU Máy • 100% Riêng Tư)</option>
                  <option value="gemini">Google Gemini (Gemini 1.5 Flash / Pro)</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="deepseek">DeepSeek (DeepSeek Chat)</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="ollama">Local Ollama (Self-Hosted)</option>
                  <option value="mock">Mô Phỏng Offline (Kho Câu Có Sẵn)</option>
                </select>
              </div>

              {/* Python Accelerator Panel */}
              {aiConfig.provider === 'python_local' && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/30 p-3.5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        Máy Chủ Python Accelerator
                      </div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
                        <span>🐍</span>
                        <span>
                          {pythonStatus?.online
                            ? `${pythonStatus.hardware || 'Sẵn Sàng'} (${pythonStatus.activeWorkers || 8} luồng)`
                            : 'Chưa kết nối máy chủ'}
                        </span>
                      </div>
                    </div>
                    <Badge variant={pythonStatus?.online ? 'success' : 'warning'} size="sm" dot>
                      {pythonStatus?.online ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  {!pythonStatus?.online ? (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2.5 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex flex-col gap-1.5">
                      <div>⚠️ Máy chủ Python chưa bật tại cổng 8765. Hãy chạy lệnh trong terminal:</div>
                      <code className="bg-amber-100 dark:bg-amber-900/60 px-2 py-1 rounded font-mono text-[11px] text-amber-900 dark:text-amber-200 select-all">
                        python3 python-engine/server.py
                      </code>
                      <button
                        onClick={() => checkPythonEngineStatus().then(setPythonStatus)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1 self-start"
                      >
                        🔄 Thử Lại Kết Nối
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">
                          Python {pythonStatus.pythonVersion || '3.x'} • Cổng 8765
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBenchmarking}
                          onClick={handleRunBenchmark}
                          className="text-xs py-1"
                        >
                          {isBenchmarking ? 'Đang đo...' : '⚡ Đo Tốc Độ (50 câu)'}
                        </Button>
                      </div>

                      {benchmarkResult && (
                        <div className="p-2.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex justify-between items-center">
                          <span>
                            🚀 Tốc độ: <strong>{benchmarkResult.throughput.toLocaleString()} câu/giây</strong>
                          </span>
                          <span>Độ trễ: {benchmarkResult.durationMs}ms</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* WebGPU Panel */}
              {aiConfig.provider === 'webgpu' && (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 p-3.5 flex flex-col gap-3">
                  {/* Hardware Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        Phần Cứng WebGPU Thiết Bị
                      </div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
                        <span>🖥️</span>
                        <span>{webgpuStatus?.adapterName || 'Đang quét WebGPU...'}</span>
                      </div>
                    </div>
                    <Badge variant={webgpuStatus?.supported ? 'success' : 'warning'} size="sm" dot>
                      {webgpuStatus?.supported ? 'Sẵn Sàng' : 'Không Hỗ Trợ'}
                    </Badge>
                  </div>

                  {webgpuStatus?.error && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40">
                      ⚠️ {webgpuStatus.error}
                    </div>
                  )}

                  {/* WebGPU Model Selection */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 block">
                      Chọn Mô Hình WebGPU
                    </label>
                    <select
                      value={aiConfig.model || 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'}
                      onChange={(e) => setAiConfig((prev) => ({ ...prev, model: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                    >
                      {SUPPORTED_WEBGPU_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.size}) - {m.speed}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preload / Warmup Button & Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Trạng thái VRAM:{' '}
                        {webgpuProgress?.isLoaded ? (
                          <strong className="text-emerald-600 dark:text-emerald-400">Đã nạp vào VRAM</strong>
                        ) : (
                          'Chưa nạp'
                        )}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isLoadingWebGPU || !webgpuStatus?.supported || webgpuProgress?.isLoaded}
                        onClick={handlePreloadWebGPU}
                        className="text-xs py-1"
                      >
                        {isLoadingWebGPU ? 'Đang nạp...' : webgpuProgress?.isLoaded ? '✓ Đã Nạp' : '⚡ Nạp Trước Mô Hình'}
                      </Button>
                    </div>

                    {webgpuProgress && (
                      <div className="flex flex-col gap-1">
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full transition-all duration-200"
                            style={{ width: `${Math.round(webgpuProgress.progress * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono truncate">
                          {webgpuProgress.text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {aiConfig.provider !== 'web_free' && aiConfig.provider !== 'webgpu' && aiConfig.provider !== 'python_local' && aiConfig.provider !== 'mock' && (
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 block">
                    API Key
                  </label>
                  <Input
                    type="password"
                    placeholder="Nhập API key của bạn (chỉ lưu tại trình duyệt)..."
                    value={aiConfig.apiKey || ''}
                    onChange={(e) => setAiConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                    className="text-xs py-1.5"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 block">
                  Phong Cách Dịch (Game Tone)
                </label>
                <select
                  value={aiConfig.tone}
                  onChange={(e) =>
                    setAiConfig((prev) => ({
                      ...prev,
                      tone: e.target.value as TranslationTone,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs"
                >
                  <option value="fantasy_rpg">Nhập vai Huyền ảo (Fantasy RPG) - Trang trọng, ma thuật</option>
                  <option value="visual_novel">Visual Novel (Anime) - Tự nhiên, tình cảm, xưng hô linh hoạt</option>
                  <option value="wuxia">Tiên hiệp / Kiếm hiệp (Wuxia) - Hán Việt, huynh đệ, tại hạ</option>
                  <option value="game_casual">Đại chúng / Hiện đại (Casual) - Ngắn gọn, dễ hiểu</option>
                  <option value="sci_fi">Khoa học viễn tưởng (Sci-Fi) - Công nghệ, vũ trụ</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 block">
                  Ngôn Ngữ Đích
                </label>
                <select
                  value={aiConfig.targetLang}
                  onChange={(e) => setAiConfig((prev) => ({ ...prev, targetLang: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs"
                >
                  <option value="vi">Tiếng Việt (Vietnamese)</option>
                  <option value="en">Tiếng Anh (English)</option>
                  <option value="ja">Tiếng Nhật (Japanese)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="primary" size="sm" onClick={() => setShowSettingsModal(false)}>
                Hoàn Tất & Lưu
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Glossary Manager Modal */}
      {showGlossaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl max-h-[85vh] flex flex-col">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Bảng Thuật Ngữ & Tên Nhân Vật (Glossary)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Giúp AI dịch nhất quán tên nhân vật, địa danh, vũ khí và kỹ năng xuyên suốt toàn bộ game.
            </p>

            {/* Add New Term */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800">
              <Input
                placeholder="Từ gốc (vd: Eldoria)..."
                value={newGlossaryTerm.term}
                onChange={(e) => setNewGlossaryTerm((p) => ({ ...p, term: e.target.value }))}
                className="text-xs py-1"
              />
              <Input
                placeholder="Dịch sang (vd: Eldoria)..."
                value={newGlossaryTerm.translation}
                onChange={(e) =>
                  setNewGlossaryTerm((p) => ({ ...p, translation: e.target.value }))
                }
                className="text-xs py-1"
              />
              <div className="flex gap-2">
                <select
                  value={newGlossaryTerm.category}
                  onChange={(e) =>
                    setNewGlossaryTerm((p) => ({
                      ...p,
                      category: e.target.value as GlossaryItem['category'],
                    }))
                  }
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 text-xs flex-1"
                >
                  <option value="character">Nhân vật</option>
                  <option value="location">Địa danh</option>
                  <option value="item">Vật phẩm</option>
                  <option value="skill">Kỹ năng</option>
                  <option value="general">Khác</option>
                </select>
                <Button variant="primary" size="sm" onClick={handleAddGlossaryTerm} className="text-xs">
                  Thêm
                </Button>
              </div>
            </div>

            {/* Glossary Table */}
            <div className="flex-1 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 dark:bg-zinc-800/60 sticky top-0 text-zinc-500 dark:text-zinc-400 font-semibold">
                  <tr>
                    <th className="p-2.5">Từ Gốc</th>
                    <th className="p-2.5">Bản Dịch</th>
                    <th className="p-2.5">Phân Loại</th>
                    <th className="p-2.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {aiConfig.glossary.map((g) => (
                    <tr key={g.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                      <td className="p-2.5 font-medium text-zinc-800 dark:text-zinc-200">{g.term}</td>
                      <td className="p-2.5 text-indigo-600 dark:text-indigo-400 font-medium">
                        {g.translation}
                      </td>
                      <td className="p-2.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {g.category}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() =>
                            setAiConfig((prev) => ({
                              ...prev,
                              glossary: prev.glossary.filter((item) => item.id !== g.id),
                            }))
                          }
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowGlossaryModal(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AI Engine & Structure Inspector */}
      {showAiInspectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl max-h-[85vh] flex flex-col">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Phân Tích Cấu Trúc Bằng AI (Engine Inspector)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              AI tự động phân tích cấu trúc tệp của game để trích xuất khóa văn bản và mã điều khiển.
            </p>

            <div className="flex-1 overflow-y-auto font-mono text-xs p-4 rounded-xl bg-zinc-950 text-zinc-200 leading-relaxed whitespace-pre-wrap select-all">
              {buildAIEnginePrompt(
                project.files.map((f) => ({
                  name: f.name,
                  path: f.name,
                  size: f.size,
                  sampleContent: f.rawContent.slice(0, 800),
                }))
              )}
            </div>

            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-zinc-500">
                Engine hiện tại: <strong className="text-indigo-500">{project.engine.name}</strong>
              </span>
              <Button variant="primary" size="sm" onClick={() => setShowAiInspectorModal(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Speaker Personas & Pronoun Manager Modal */}
      {showPersonasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎭</span>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Phân Tích Đại Từ & Vai Trò Nhân Vật
                  </h3>
                  <Badge variant="secondary" size="sm">
                    {personas.length} nhân vật
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  AI phân tích tính cách, tuổi tác, vị thế và quan hệ để gán cặp đại từ phù hợp (Ta - Ngươi, Lão - Cháu, Mình - Cậu), loại bỏ dịch máy &quot;Tôi - Bạn&quot;.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isAnalyzingPersonas}
                  onClick={handleAnalyzePersonasWithAI}
                  className="text-xs bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-xs"
                >
                  {isAnalyzingPersonas ? (
                    <span className="flex items-center gap-1.5">
                      <span className="animate-spin">⏳</span> Đang phân tích...
                    </span>
                  ) : (
                    <span>⚡ AI Tự Động Phân Tích</span>
                  )}
                </Button>
              </div>
            </div>

            {/* Quick Add Custom Character Bar */}
            <div className="my-4 p-3.5 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 flex flex-col gap-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300">
                Thêm hoặc Định Nghĩa Nhân Vật Mới
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <Input
                  placeholder="Tên nhân vật (vd: Arthur)..."
                  value={newPersona.speaker}
                  onChange={(e) => setNewPersona((p) => ({ ...p, speaker: e.target.value }))}
                  className="text-xs py-1 sm:col-span-2"
                />
                <Input
                  placeholder="Vai trò (vd: Hiệp sĩ bảo vệ)..."
                  value={newPersona.role}
                  onChange={(e) => setNewPersona((p) => ({ ...p, role: e.target.value }))}
                  className="text-xs py-1 sm:col-span-2"
                />
                <Input
                  placeholder="Xưng (vd: Ta/Tôi)..."
                  value={newPersona.firstPerson}
                  onChange={(e) => setNewPersona((p) => ({ ...p, firstPerson: e.target.value }))}
                  className="text-xs py-1"
                />
                <Input
                  placeholder="Hô (vd: Ngươi/Cậu)..."
                  value={newPersona.secondPerson}
                  onChange={(e) => setNewPersona((p) => ({ ...p, secondPerson: e.target.value }))}
                  className="text-xs py-1"
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <select
                    value={newPersona.gender}
                    onChange={(e) =>
                      setNewPersona((p) => ({ ...p, gender: e.target.value as SpeakerPersona['gender'] }))
                    }
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                  >
                    <option value="male">Nam (Male)</option>
                    <option value="female">Nữ (Female)</option>
                    <option value="neutral">Trung tính / Không rõ</option>
                  </select>
                  <select
                    value={newPersona.ageGroup}
                    onChange={(e) =>
                      setNewPersona((p) => ({ ...p, ageGroup: e.target.value as SpeakerPersona['ageGroup'] }))
                    }
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                  >
                    <option value="elder">Trưởng bối / Già (Elder)</option>
                    <option value="adult">Trưởng thành (Adult)</option>
                    <option value="young">Trẻ tuổi / Thanh thiếu niên (Young)</option>
                  </select>
                  <Input
                    placeholder="Gợi ý văn phong (vd: Kiêu hãnh, trang trọng)..."
                    value={newPersona.toneInstruction || ''}
                    onChange={(e) =>
                      setNewPersona((p) => ({ ...p, toneInstruction: e.target.value }))
                    }
                    className="text-xs py-1 w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomPersona}
                  className="text-xs bg-white dark:bg-zinc-900"
                >
                  + Thêm Nhân Vật
                </Button>
              </div>
            </div>

            {/* Personas Table */}
            <div className="flex-1 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
              {personas.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  Chưa phát hiện nhân vật có tên trong dự án hiện tại. Bấm nút <strong>⚡ AI Tự Động Phân Tích</strong> hoặc thêm thủ công ở trên.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-800/60 sticky top-0 text-zinc-500 dark:text-zinc-400 font-semibold z-10">
                    <tr>
                      <th className="p-2.5">Nhân Vật</th>
                      <th className="p-2.5">Vai Trò & Thân Phận</th>
                      <th className="p-2.5">Giới Tính / Tuổi</th>
                      <th className="p-2.5">Đại Từ Xưng</th>
                      <th className="p-2.5">Đại Từ Hô</th>
                      <th className="p-2.5">Sắc Thái Xưng Hô</th>
                      <th className="p-2.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {personas.map((p) => (
                      <tr key={p.speaker} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                        {/* Speaker Name */}
                        <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <span>
                              {p.role?.toLowerCase().includes('lão') || p.ageGroup === 'elder'
                                ? '👴'
                                : p.role?.toLowerCase().includes('hiệp sĩ')
                                  ? '🛡️'
                                  : p.role?.toLowerCase().includes('pháp sư')
                                    ? '🧙‍♀️'
                                    : p.role?.toLowerCase().includes('vương')
                                      ? '👑'
                                      : p.gender === 'female'
                                        ? '🌸'
                                        : '🗣️'}
                            </span>
                            <span>{p.speaker}</span>
                          </span>
                        </td>

                        {/* Role */}
                        <td className="p-2.5">
                          <Input
                            value={p.role}
                            onChange={(e) =>
                              handleUpdatePersonaField(p.speaker, 'role', e.target.value)
                            }
                            className="text-xs py-0.5 px-2 h-7 min-w-[140px]"
                          />
                        </td>

                        {/* Gender & Age */}
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {p.gender === 'female' ? 'Nữ' : p.gender === 'male' ? 'Nam' : 'Khác'} •{' '}
                            {p.ageGroup === 'elder' ? 'Già' : p.ageGroup === 'young' ? 'Trẻ' : 'Trưởng thành'}
                          </span>
                        </td>

                        {/* First Person (Xưng) */}
                        <td className="p-2.5">
                          <Input
                            value={p.firstPerson}
                            onChange={(e) =>
                              handleUpdatePersonaField(p.speaker, 'firstPerson', e.target.value)
                            }
                            className="text-xs py-0.5 px-2 h-7 w-20 font-bold text-violet-700 dark:text-violet-300 bg-violet-50/50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/60"
                          />
                        </td>

                        {/* Second Person (Hô) */}
                        <td className="p-2.5">
                          <Input
                            value={p.secondPerson}
                            onChange={(e) =>
                              handleUpdatePersonaField(p.speaker, 'secondPerson', e.target.value)
                            }
                            className="text-xs py-0.5 px-2 h-7 w-20 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60"
                          />
                        </td>

                        {/* Tone & Context */}
                        <td className="p-2.5">
                          <Input
                            value={p.toneInstruction || ''}
                            onChange={(e) =>
                              handleUpdatePersonaField(p.speaker, 'toneInstruction', e.target.value)
                            }
                            placeholder="Hướng dẫn xưng hô..."
                            className="text-xs py-0.5 px-2 h-7 min-w-[160px]"
                          />
                        </td>

                        {/* Action */}
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeletePersona(p.speaker)}
                            className="text-red-500 hover:text-red-700 text-xs px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">
                💡 Cặp đại từ xưng hô sẽ được tự động kích hoạt trong các công cụ dịch: <strong>WebGPU, Python Engine, Gemini, OpenAI, DeepSeek</strong>.
              </span>
              <Button variant="primary" size="sm" onClick={() => setShowPersonasModal(false)}>
                Áp Dụng & Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
