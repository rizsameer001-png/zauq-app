import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  User,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { db, handleFirestoreError, OperationType, logUserActivity } from "../firebase";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  getDocs
} from "firebase/firestore";
import { BookReview } from "../types";

interface BookReviewsProps {
  bookId: string;
  user: FirebaseUser | null;
  triggerToast: (msg: string) => void;
}

export const BookReviews: React.FC<BookReviewsProps> = ({ 
  bookId, 
  user, 
  triggerToast 
}) => {
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReviewText, setNewReviewText] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingRating, setEditingRating] = useState<number>(5);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Character limit for text-based reviews
  const MAX_CHAR_LIMIT = 5000;

  // Helper to recalculate and store average rating & total reviews count on the book document
  const updateBookStats = async (bId: string) => {
    try {
      const reviewsRef = collection(db, "books", bId, "reviews");
      const querySnapshot = await getDocs(reviewsRef);
      let totalRating = 0;
      let count = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.rating) {
          totalRating += data.rating;
        } else {
          totalRating += 5; // Default to 5
        }
        count++;
      });
      const averageRating = count > 0 ? Number((totalRating / count).toFixed(1)) : 0;
      const bookDocRef = doc(db, "books", bId);
      await updateDoc(bookDocRef, {
        averageRating,
        reviewsCount: count
      });
    } catch (e) {
      console.error("Error updating book stats: ", e);
    }
  };

  useEffect(() => {
    setLoading(true);
    const reviewsRef = collection(db, "books", bookId, "reviews");
    const reviewsQuery = query(reviewsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
      const fetchedReviews: BookReview[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedReviews.push({
          id: doc.id,
          bookId: data.bookId,
          userId: data.userId,
          userName: data.userName,
          text: data.text,
          rating: data.rating,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      setReviews(fetchedReviews);
      setLoading(false);
    }, (error) => {
      console.error("Error loading reviews: ", error);
      handleFirestoreError(error, OperationType.GET, `books/${bookId}/reviews`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [bookId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      triggerToast("You must be signed in to post a review.");
      return;
    }

    const trimmedText = newReviewText.trim();
    if (!trimmedText) {
      triggerToast("Please enter some text for your commentary.");
      return;
    }

    if (trimmedText.length > MAX_CHAR_LIMIT) {
      triggerToast(`Your commentary exceeds the limit of ${MAX_CHAR_LIMIT} characters.`);
      return;
    }

    setIsSubmitting(true);
    const path = `books/${bookId}/reviews`;

    try {
      const reviewsRef = collection(db, "books", bookId, "reviews");
      const newReviewDoc = doc(reviewsRef);
      const reviewId = newReviewDoc.id;

      const reviewData = {
        id: reviewId,
        bookId,
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Classical Scholar",
        text: trimmedText,
        rating: rating,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(newReviewDoc, reviewData);
      setNewReviewText("");
      setRating(5); // Reset to default 5 stars
      await updateBookStats(bookId);
      logUserActivity("add_review", `Posted commentary on book ID ${bookId}: "${trimmedText.substring(0, 40)}..."`);
      triggerToast("Your literary commentary has been graced onto this book! ✒️");
    } catch (error) {
      console.error("Error saving review: ", error);
      triggerToast("Failed to save your review. Please try again.");
      handleFirestoreError(error, OperationType.WRITE, `${path}/(new)`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (review: BookReview) => {
    setEditingReviewId(review.id);
    setEditingText(review.text);
    setEditingRating(review.rating || 5);
  };

  const handleSaveEdit = async (reviewId: string) => {
    const trimmedText = editingText.trim();
    if (!trimmedText) {
      triggerToast("Commentary text cannot be blank.");
      return;
    }

    if (trimmedText.length > MAX_CHAR_LIMIT) {
      triggerToast(`Your commentary exceeds the limit of ${MAX_CHAR_LIMIT} characters.`);
      return;
    }

    const path = `books/${bookId}/reviews/${reviewId}`;

    try {
      const reviewDocRef = doc(db, "books", bookId, "reviews", reviewId);
      await updateDoc(reviewDocRef, {
        text: trimmedText,
        rating: editingRating,
        updatedAt: serverTimestamp(),
      });

      setEditingReviewId(null);
      setEditingText("");
      await updateBookStats(bookId);
      logUserActivity("edit_review", `Updated commentary on book ID ${bookId}: "${trimmedText.substring(0, 40)}..."`);
      triggerToast("Your commentary has been revised successfully. 📝");
    } catch (error) {
      console.error("Error updating review: ", error);
      triggerToast("Failed to update commentary.");
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const path = `books/${bookId}/reviews/${reviewId}`;

    try {
      const reviewDocRef = doc(db, "books", bookId, "reviews", reviewId);
      await deleteDoc(reviewDocRef);
      setDeletingReviewId(null);
      await updateBookStats(bookId);
      logUserActivity("delete_review", `Deleted commentary on book ID ${bookId}`);
      triggerToast("Your commentary has been removed. 🗑️");
    } catch (error) {
      console.error("Error deleting review: ", error);
      triggerToast("Failed to delete commentary.");
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    let date: Date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div id="book-reviews-section" className="flex flex-col gap-4 border-t border-stone-900 pt-5 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-500" />
          <h4 className="text-[10px] font-mono text-stone-300 uppercase tracking-widest font-semibold">
            Literary Discourse & Commentary ({reviews.length})
          </h4>
        </div>
      </div>

      {/* Review Submission Form */}
      {user ? (
        <form onSubmit={handleSubmitReview} className="flex flex-col gap-2.5 bg-stone-950/60 border border-stone-900 p-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400">
              {getUserInitials(user.displayName || user.email?.split("@")[0] || "Scholar")}
            </div>
            <span className="text-xs font-serif font-medium text-stone-300">
              {user.displayName || user.email?.split("@")[0] || "Classical Scholar"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-stone-900/10 p-2.5 rounded-xl border border-stone-900/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-serif text-stone-400">Aesthetic Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    id={`rating-star-btn-${star}`}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-amber-500 hover:scale-110 transition-all cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`w-4 h-4 transition-all ${
                        star <= rating 
                          ? "fill-amber-500 text-amber-500 drop-shadow-[0_0_2px_rgba(245,158,11,0.3)]" 
                          : "text-stone-750 hover:text-amber-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[10px] font-mono font-medium text-amber-500/80 uppercase tracking-wider">
              {rating === 5 && "Intikhāb • انتخاب (Masterpiece)"}
              {rating === 4 && "Maqbūl • مقبول (Delightful)"}
              {rating === 3 && "Pasandīda • پسندیدہ (Pleasing)"}
              {rating === 2 && "Sāda • سادہ (Simple)"}
              {rating === 1 && "Na-Mukammal • نامکمل (Unsatisfactory)"}
            </span>
          </div>

          <div className="relative">
            <textarea
              id="new-review-input"
              value={newReviewText}
              onChange={(e) => setNewReviewText(e.target.value)}
              placeholder="Share your thoughts, analysis, or emotional resonance with this masterpiece..."
              rows={3}
              maxLength={MAX_CHAR_LIMIT}
              className="w-full bg-stone-900/30 hover:bg-stone-900/50 focus:bg-stone-900/50 text-stone-200 text-xs rounded-xl p-3 border border-stone-850 focus:border-amber-500/40 outline-none transition-all placeholder-stone-600 font-serif resize-none leading-relaxed"
            />
            
            <div className="absolute bottom-2 right-3 text-[9px] font-mono text-stone-600">
              {newReviewText.length} / {MAX_CHAR_LIMIT}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              id="submit-review-btn"
              type="submit"
              disabled={isSubmitting || !newReviewText.trim()}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 hover:text-amber-300 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 font-bold"
            >
              {isSubmitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              <span>Grace this Book</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-stone-900/10 border border-dashed border-stone-900 rounded-2xl text-center">
          <AlertCircle className="w-5 h-5 text-stone-600 mx-auto mb-1.5" />
          <p className="text-[11px] font-serif text-stone-400 leading-relaxed">
            Please sign in to participate in the literary discourse and compose your commentary.
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div className="flex flex-col gap-3.5 mt-2">
        {loading ? (
          <div className="py-6 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-stone-500 mx-auto" />
            <p className="text-[10px] font-mono text-stone-500 uppercase tracking-widest mt-2">Retrieving scrolls of commentary...</p>
          </div>
        ) : reviews.length > 0 ? (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {reviews.map((review) => {
                const isCurrentUserReview = user && review.userId === user.uid;
                const isEditing = editingReviewId === review.id;
                const isConfirmingDelete = deletingReviewId === review.id;

                return (
                  <motion.div
                    key={review.id}
                    id={`review-card-${review.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="p-4 rounded-2xl bg-stone-900/15 border border-stone-900/60 flex flex-col gap-2.5 relative group/card"
                  >
                    {/* Review Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-[10px] font-bold text-stone-400">
                          {getUserInitials(review.userName)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-serif font-bold text-stone-300">
                              {review.userName}
                            </span>
                            <div className="flex items-center gap-0.5 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-2.5 h-2.5 ${
                                    star <= (review.rating || 5) 
                                      ? "fill-amber-500 text-amber-500" 
                                      : "text-stone-850"
                                  }`}
                                />
                              ))}
                              <span className="text-[8px] font-mono text-amber-400 font-bold ml-1">
                                {review.rating || 5}.0
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-stone-500 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 text-stone-600" />
                            {formatDate(review.createdAt)}
                            {review.updatedAt && review.createdAt && 
                             (review.updatedAt.seconds !== review.createdAt.seconds || 
                              review.updatedAt !== review.createdAt) && (
                              <span className="text-amber-500/60 font-medium font-sans text-[8px] uppercase tracking-wider ml-1">
                                (Revised)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Author Control Actions */}
                      {isCurrentUserReview && !isEditing && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                          <button
                            id={`edit-review-${review.id}`}
                            onClick={() => handleStartEdit(review)}
                            className="p-1 rounded bg-stone-900/60 hover:bg-stone-850 border border-stone-850 hover:border-amber-500/20 text-stone-400 hover:text-amber-400 transition-all cursor-pointer"
                            title="Edit commentary"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            id={`delete-review-${review.id}`}
                            onClick={() => setDeletingReviewId(review.id)}
                            className="p-1 rounded bg-stone-900/60 hover:bg-rose-950/20 border border-stone-850 hover:border-rose-500/20 text-stone-400 hover:text-rose-400 transition-all cursor-pointer"
                            title="Delete commentary"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Review Content / Editing State / Deleting State */}
                    {isConfirmingDelete ? (
                      <div className="bg-rose-950/10 border border-rose-900/30 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                        <span className="text-[11px] font-serif text-rose-300 flex items-center gap-1.5">
                          Are you sure you want to delete this commentary?
                        </span>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            id={`confirm-delete-${review.id}`}
                            onClick={() => handleDeleteReview(review.id)}
                            className="flex-1 sm:flex-initial px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer font-semibold"
                          >
                            Yes, Delete
                          </button>
                          <button
                            id={`cancel-delete-${review.id}`}
                            onClick={() => setDeletingReviewId(null)}
                            className="flex-1 sm:flex-initial px-3 py-1 bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-400 hover:text-stone-300 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : isEditing ? (
                      <div className="flex flex-col gap-2 bg-stone-950/40 p-3 rounded-xl border border-stone-900">
                        <textarea
                          id={`edit-review-input-${review.id}`}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          maxLength={MAX_CHAR_LIMIT}
                          className="w-full bg-stone-900/40 text-stone-200 text-xs rounded-lg p-2 border border-stone-800 focus:border-amber-500/30 outline-none transition-all font-serif resize-none leading-relaxed"
                        />
                        <div className="flex items-center gap-3 bg-stone-900/30 p-2 rounded-lg border border-stone-900/40 mb-1">
                          <span className="text-[10px] font-serif text-stone-400">Revise Rating:</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                id={`edit-rating-star-${star}`}
                                type="button"
                                onClick={() => setEditingRating(star)}
                                className="text-amber-500 hover:scale-110 transition-all cursor-pointer focus:outline-none"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 transition-all ${
                                    star <= editingRating 
                                      ? "fill-amber-500 text-amber-500" 
                                      : "text-stone-850 hover:text-amber-400"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="text-[9px] font-mono text-amber-500/75">
                            {editingRating === 5 && "Intikhāb • انتخاب"}
                            {editingRating === 4 && "Maqbūl • مقبول"}
                            {editingRating === 3 && "Pasandīda • پسندیدہ"}
                            {editingRating === 2 && "Sāda • سادہ"}
                            {editingRating === 1 && "Na-Mukammal • نامکمل"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-mono text-stone-600">
                            {editingText.length} / {MAX_CHAR_LIMIT}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              id={`save-edit-${review.id}`}
                              onClick={() => handleSaveEdit(review.id)}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-[9px] font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>Save</span>
                            </button>
                            <button
                              id={`cancel-edit-${review.id}`}
                              onClick={() => setEditingReviewId(null)}
                              className="px-2.5 py-1 bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-400 hover:text-stone-300 text-[9px] font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-2.5 h-2.5" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="font-serif text-stone-300 text-xs md:text-[13px] leading-relaxed whitespace-pre-line pl-1">
                        {review.text}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-8 text-center bg-stone-900/5 border border-dashed border-stone-900/60 rounded-2xl">
            <MessageSquare className="w-6 h-6 text-stone-700 mx-auto mb-2" />
            <p className="text-[10px] font-mono text-stone-500 uppercase tracking-widest leading-relaxed">
              No Discourse has been logged yet
            </p>
            <p className="text-[11px] font-serif text-stone-500 max-w-sm mx-auto mt-1 px-4 leading-normal">
              Be the first to grace this classical work with your personal reflections and commentary.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
