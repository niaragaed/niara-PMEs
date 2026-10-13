"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { SelectField, TextField, TextareaField } from "@/components/perfil/FormField";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { isValidEmail } from "@/lib/masks";
import { useDictionary } from "@/lib/i18n/client";

const CONTACT_EMAIL = "niaragaed@gmail.com";

type SubjectKey = keyof Dictionary["contact"]["form"]["subjectOptions"];

const SUBJECTS: SubjectKey[] = ["company", "investor", "partnerships", "press", "support", "other"];

type FormData = {
  name: string;
  email: string;
  subject: SubjectKey;
  message: string;
};

type FormErrors = Partial<Record<"name" | "email" | "message", string>>;

const EMPTY_FORM: FormData = {
  name: "",
  email: "",
  subject: "company",
  message: "",
};

export function ContactForm() {
  const dict = useDictionary();
  // Dados do formulário servem só para montar o mailto no navegador —
  // nunca são persistidos nem enviados a servidor.
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const t = dict.contact.form;

  function handleChange(field: "name" | "email" | "message") {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  function handleSubjectChange(event: ChangeEvent<HTMLSelectElement>) {
    setForm((current) => ({ ...current, subject: event.target.value as SubjectKey }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = t.errors.name;
    if (!form.email.trim() || !isValidEmail(form.email)) nextErrors.email = t.errors.email;
    if (!form.message.trim()) nextErrors.message = t.errors.message;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const subjectLabel = t.subjectOptions[form.subject];
    const subject = encodeURIComponent(t.subjectPrefix(subjectLabel));
    const body = encodeURIComponent(
      `Nome: ${form.name}\nEmail: ${form.email}\nAssunto: ${subjectLabel}\n\nMensagem:\n${form.message}`,
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-panel-border bg-panel p-6"
    >
      <TextField
        id="contact-name"
        label={t.name}
        value={form.name}
        onChange={handleChange("name")}
        error={errors.name}
        autoComplete="name"
      />

      <TextField
        id="contact-email"
        label={t.email}
        type="email"
        value={form.email}
        onChange={handleChange("email")}
        error={errors.email}
        autoComplete="email"
      />

      <SelectField
        id="contact-subject"
        label={t.subject}
        value={form.subject}
        onChange={handleSubjectChange}
      >
        {SUBJECTS.map((subject) => (
          <option key={subject} value={subject}>
            {t.subjectOptions[subject]}
          </option>
        ))}
      </SelectField>

      <TextareaField
        id="contact-message"
        label={t.message}
        value={form.message}
        onChange={handleChange("message")}
        error={errors.message}
      />

      <p className="text-[11px] text-on-military-muted">{t.note(CONTACT_EMAIL)}</p>

      <button
        type="submit"
        className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600"
      >
        {t.sendButton}
      </button>
    </form>
  );
}
