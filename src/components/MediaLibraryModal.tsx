import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Download, Trash2, Check, Search, Image as ImageIcon, Sparkles } from 'lucide-react';
import { MediaImage, getMediaLibrary, refreshMediaLibrary, processImageFile, deleteMediaImageFromStorage, downloadImage } from '../utils/mediaLibrary';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (imageUrl: string) => void;
  selectedImageUrl?: string;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  selectedImageUrl,
}) => {
  const [images, setImages] = useState<MediaImage[]>(() => getMediaLibrary());
  const [filter, setFilter] = useState<'all' | 'uploaded' | 'presets'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) refreshMediaLibrary().then(setImages);
  }, [isOpen]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const newMedia = await processImageFile(file);
      setImages(getMediaLibrary());
      showStatus(`تم رفع صورة "${newMedia.name}" بنجاح وحفظها في المكتبة!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      showStatus(err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteMediaImageFromStorage(id);
      setImages(getMediaLibrary());
      showStatus(`تم حذف صورة "${name}" من المكتبة`);
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'تعذر حذف الصورة');
    }
  };

  if (!isOpen) return null;

  const filteredImages = images.filter((img) => {
    if (filter === 'uploaded' && img.isPreset) return false;
    if (filter === 'presets' && !img.isPreset) return false;
    if (searchQuery.trim() && !img.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0B192C] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-sm">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">مكتبة صور ووسائط شاورما ليل</h2>
              <p className="text-[11px] text-slate-300">
                رفع صور جديدة من جهازك، تحميلها، وتحديث وجبات المنيو باستمرار
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone & Filter Bar */}
        <div className="p-4 border-b border-stone-200 bg-stone-50 space-y-3 shrink-0">
          {statusMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="media-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full sm:w-auto bg-[#E61C24] hover:bg-[#cf151c] disabled:bg-stone-400 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'جاري معالجة الصورة...' : 'رفع صورة جديدة من جهازي (Upload)'}</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-stone-200/70 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                الكل ({images.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('uploaded')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filter === 'uploaded' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                المرفوعة من الجهاز ({images.filter((i) => !i.isPreset).length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('presets')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filter === 'presets' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                الصور الجاهزة ({images.filter((i) => i.isPreset).length})
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن صورة باسمها..."
              className="w-full text-xs pr-9 pl-3 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {filteredImages.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl p-6 text-stone-500 space-y-2">
              <ImageIcon className="w-10 h-10 mx-auto text-stone-300" />
              <p className="font-bold text-sm text-stone-700">لا توجد صور مطابقة</p>
              <p className="text-xs">اضغط على زر "رفع صورة جديدة من جهازي" لإضافة صور وجبات جديدة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {filteredImages.map((media) => {
                const isSelected = selectedImageUrl === media.url;

                return (
                  <div
                    key={media.id}
                    className={`group bg-white rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                      isSelected ? 'border-red-600 ring-2 ring-red-500' : 'border-stone-200'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[4/3] w-full bg-stone-100 overflow-hidden">
                      <img
                        src={media.url}
                        alt={media.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {media.isPreset ? (
                        <span className="absolute top-2 right-2 bg-stone-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          صورة رسمية
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          مرفوعة حديثاً
                        </span>
                      )}

                      {isSelected && (
                        <div className="absolute inset-0 bg-red-600/20 backdrop-blur-2xs flex items-center justify-center">
                          <span className="bg-red-600 text-white p-1 rounded-full shadow-md">
                            <Check className="w-5 h-5 stroke-[3]" />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-2.5 flex flex-col justify-between flex-1 gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-stone-900 truncate" title={media.name}>
                          {media.name}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-stone-400 mt-0.5">
                          <span>{media.size || 'صورة'}</span>
                          <span>{media.createdAt}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1">
                        {onSelectImage && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectImage(media.url);
                              onClose();
                            }}
                            className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#0B192C] hover:bg-[#152c4a] text-white'
                            }`}
                          >
                            <span>{isSelected ? 'مختارة' : 'استخدام'}</span>
                          </button>
                        )}

                        {/* Download button */}
                        <button
                          type="button"
                          onClick={() => downloadImage(media.url, media.name)}
                          className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors"
                          title="تحميل الصورة إلى جهازي"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button (if not preset) */}
                        {!media.isPreset && (
                          <button
                            type="button"
                            onClick={() => handleDelete(media.id, media.name)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            title="حذف الصورة من المكتبة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs">
          <span className="text-stone-500 font-medium">
            يتم حفظ الصور المرفوعة محلياً وتظهر لك باستمرار لتعديل الوجبات.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2 rounded-xl font-bold transition-colors"
          >
            إغلاق المكتبة
          </button>
        </div>
      </div>
    </div>
  );
};
