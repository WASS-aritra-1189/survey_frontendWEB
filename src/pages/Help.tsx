import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchFaqs, createFaq, updateFaq, deleteFaq } from "@/store/faqSlice";
import { FAQ } from "@/services/faqService";

const CATEGORIES = ["GENERAL", "SURVEY", "DEVICE", "ACCOUNT", "TECHNICAL", "BILLING"];
const emptyForm = { question: "", answer: "", category: "GENERAL", isActive: true };

export default function Help() {
  const dispatch = useAppDispatch();
  const { tokens, account } = useAuthStore();
  const { data: faqs, isLoading, isSaving } = useAppSelector((state) => state.faq);

  const isAdmin =
    account?.roles === "ROOT" ||
    account?.roles === "ADMIN" ||
    account?.roles === "ROOT_STAFF";

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (tokens?.accessToken) {
      dispatch(fetchFaqs({ token: tokens.accessToken, isAdmin }));
    }
  }, [dispatch, tokens?.accessToken]);

  const categories = [
    "ALL",
    ...Array.from(new Set(faqs.map((f) => f.category).filter(Boolean))),
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" || faq.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const openAdd = () => {
    setEditingFaq(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      isActive: faq.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tokens?.accessToken) return;
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    try {
      if (editingFaq) {
        await dispatch(updateFaq({ token: tokens.accessToken, id: editingFaq.id, data: form })).unwrap();
        toast.success("FAQ updated");
      } else {
        await dispatch(createFaq({ token: tokens.accessToken, data: form as any })).unwrap();
        toast.success("FAQ created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save FAQ");
    }
  };

  const handleDelete = async () => {
    if (!tokens?.accessToken || !deleteId) return;
    try {
      await dispatch(deleteFaq({ token: tokens.accessToken, id: deleteId })).unwrap();
      toast.success("FAQ deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete FAQ");
    }
  };

  return (
    <AdminLayout title="Help & Support" subtitle="Frequently asked questions">
      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>Frequently Asked Questions</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search FAQs..."
                  className="pl-9 w-52"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "ALL" ? "All Categories" : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && (
                <Button onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-1" /> Add FAQ
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredFaqs.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No FAQs found</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 pr-4">
                      <span className="flex-1">{faq.question}</span>
                      <div
                        className="flex items-center gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {faq.category && (
                          <Badge variant="outline" className="text-xs">
                            {faq.category}
                          </Badge>
                        )}
                        {isAdmin && !faq.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(faq)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(faq.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground whitespace-pre-line">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Question *</Label>
              <Input
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="Enter the question"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Answer *</Label>
              <Textarea
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder="Enter the answer"
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingFaq ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete FAQ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this FAQ? This cannot be undone.
          </p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
