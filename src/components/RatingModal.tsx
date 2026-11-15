import React, { useState } from 'react';
import { X, Star, Trash2, Edit2, CheckCircle2, MessageSquare, Send } from 'lucide-react';
import { MenuItem, Review } from '../types';

interface RatingModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
  onAddReview: (itemId: string, rating: number, userName: string, comment?: string) => void;
  isAdmin: boolean;
  onDeleteReview?: (reviewId: string) => void;
  onEditReview?: (reviewId: string, updatedRating: number, updatedComment: string) => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  item,
  isOpen,
  onClose,
  reviews,
  onAddReview,
  isAdmin,
  onDeleteReview,
  onEditReview,
}) => {
  // State for new rating submission
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [hoveredStars, setHoveredStars] = useState<number | null>(null);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Admin edit single review state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>('');

  if (!isOpen || !item) return null;

  const itemReviews = reviews.filter((r) => r.itemId === item.id);
  const averageRating =
    itemReviews.length > 0
      ? (itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length).toFixed(1)
      : '5.0';

  const starLabels: { [key: number]: string } = {
    1: 'سيء',
    2: 'مقبول',
    3: 'جيد',
    4: 'لذيذ جداً',
    5: 'أسطوري ويستحق التجربة 🔥',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = reviewerName.trim() || 'زبون شاورما ليل';
    onAddReview(item.id, selectedStars, name, commentText.trim());
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setCommentText('');
    }, 1800);
  };

  const handleStartEdit = (r: Review) => {
    setEditingReviewId(r.id);
    setEditRating(r.rating);
    setEditComment(r.comment || '');
  };

  const handleSaveEdit = (reviewId: string) => {
    if (onEditReview) {
      onEditReview(reviewId, editRating, editComment);
    }
    setEditingReviewId(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0B192C] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={item.image}
              alt={item.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover border border-white/20"
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{averageRating}</span>
                <span className="text-slate-300">({itemReviews.length} تقييم)</span>
              </div>
              <h2 className="text-base font-bold text-white line-clamp-1">{item.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Add Rating Box */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-sm">أضف تقييمك لهذه الوجبة:</span>
              <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                {starLabels[hoveredStars || selectedStars]}
              </span>
            </div>

            {/* Stars selection row */}
            <div className="flex items-center justify-center gap-2 py-1" dir="ltr">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isLit = (hoveredStars || selectedStars) >= starValue;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setSelectedStars(starValue)}
                    onMouseEnter={() => setHoveredStars(starValue)}
                    onMouseLeave={() => setHoveredStars(null)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    aria-label={`${starValue} نجوم`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        isLit
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'fill-stone-200 text-stone-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {isSubmitted ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center justify-center gap-2 font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>شكراً لمشاركتك! تم حفظ تقييمك بنجاح.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2.5 pt-1">
                <div>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="اسمك الكريم (اختياري)"
                    className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="رأيك في طعم الشاورما، الخبز، أو الصوصات..."
                    className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#E61C24] hover:bg-[#cf151c] text-white py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-xs"
                >
                  <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                  <span>إرسال التقييم</span>
                </button>
              </form>
            )}
          </div>

          {/* Existing Customer Reviews List */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-2">
              <span className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-stone-500" />
                <span>تقييمات وتجارب الزبائن</span>
              </span>
              <span className="text-[11px] text-stone-500 font-mono">
                {itemReviews.length} تقييم
              </span>
            </div>

            {itemReviews.length === 0 ? (
              <div className="text-center py-6 bg-stone-50 rounded-2xl text-stone-500">
                كن أول من يقيّم هذه الوجبة اللذيذة!
              </div>
            ) : (
              <div className="space-y-3">
                {itemReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5"
                  >
                    {editingReviewId === rev.id ? (
                      /* Admin Edit Form for this review */
                      <div className="space-y-2 bg-white p-3 rounded-xl border border-amber-300">
                        <span className="text-[11px] font-bold text-amber-800">
                          تعديل التقييم (وضع الأدمن):
                        </span>
                        <div className="flex items-center gap-1" dir="ltr">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setEditRating(s)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  editRating >= s
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-stone-200 text-stone-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={2}
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          className="w-full text-xs p-2 border border-stone-200 rounded-lg"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingReviewId(null)}
                            className="px-2.5 py-1 text-[11px] text-stone-600 hover:bg-stone-100 rounded-lg"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(rev.id)}
                            className="px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                          >
                            حفظ التعديل
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Review */
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">{rev.userName}</span>
                            <div className="flex items-center gap-0.5 text-amber-500" dir="ltr">
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <Star
                                  key={idx}
                                  className={`w-3.5 h-3.5 ${
                                    idx < rev.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-stone-200 text-stone-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Admin Controls */}
                          {isAdmin && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEdit(rev)}
                                className="p-1 text-stone-400 hover:text-amber-600 transition-colors"
                                title="تعديل هذا التقييم"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteReview && (
                                <button
                                  onClick={() => onDeleteReview(rev.id)}
                                  className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                                  title="حذف هذا التقييم"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {rev.comment && (
                          <p className="text-stone-700 text-xs leading-relaxed">
                            {rev.comment}
                          </p>
                        )}

                        <span className="text-[10px] text-stone-400 block pt-0.5">
                          {new Date(rev.createdAt).toLocaleDateString('ar-PS', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 text-left shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white py-2 rounded-xl font-bold transition-colors text-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
