"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { SelectField, TextField, TextareaField } from "@/components/perfil/FormField";
import { ptBr } from "@/lib/i18n/pt-br";
import { isValidEmail } from "@/lib/masks";

const CONTACT_EMAIL = "niaragaed@gmail.com";

type AssuntoKey = keyof typeof ptBr.contato.form.assuntoOpcoes;

const ASSUNTOS: AssuntoKey[] = ["empresa", "investidor", "parcerias", "imprensa", "suporte", "outro"];

type FormData = {
  nome: string;
  email: string;
  assunto: AssuntoKey;
  mensagem: string;
};

type FormErrors = Partial<Record<"nome" | "email" | "mensagem", string>>;

const EMPTY_FORM: FormData = {
  nome: "",
  email: "",
  assunto: "empresa",
  mensagem: "",
};

export function ContatoForm() {
  // Dados do formulário servem só para montar o mailto no navegador —
  // nunca são persistidos nem enviados a servidor.
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const t = ptBr.contato.form;

  function handleChange(field: "nome" | "email" | "mensagem") {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  function handleAssuntoChange(event: ChangeEvent<HTMLSelectElement>) {
    setForm((current) => ({ ...current, assunto: event.target.value as AssuntoKey }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (!form.nome.trim()) nextErrors.nome = t.erros.nome;
    if (!form.email.trim() || !isValidEmail(form.email)) nextErrors.email = t.erros.email;
    if (!form.mensagem.trim()) nextErrors.mensagem = t.erros.mensagem;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const assuntoLabel = t.assuntoOpcoes[form.assunto];
    const subject = encodeURIComponent(t.assuntoPrefix(assuntoLabel));
    const body = encodeURIComponent(
      `Nome: ${form.nome}\nEmail: ${form.email}\nAssunto: ${assuntoLabel}\n\nMensagem:\n${form.mensagem}`,
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
        id="contato-nome"
        label={t.nome}
        value={form.nome}
        onChange={handleChange("nome")}
        error={errors.nome}
        autoComplete="name"
      />

      <TextField
        id="contato-email"
        label={t.email}
        type="email"
        value={form.email}
        onChange={handleChange("email")}
        error={errors.email}
        autoComplete="email"
      />

      <SelectField
        id="contato-assunto"
        label={t.assunto}
        value={form.assunto}
        onChange={handleAssuntoChange}
      >
        {ASSUNTOS.map((assunto) => (
          <option key={assunto} value={assunto}>
            {t.assuntoOpcoes[assunto]}
          </option>
        ))}
      </SelectField>

      <TextareaField
        id="contato-mensagem"
        label={t.mensagem}
        value={form.mensagem}
        onChange={handleChange("mensagem")}
        error={errors.mensagem}
      />

      <p className="text-[11px] text-on-military-muted">{t.nota(CONTACT_EMAIL)}</p>

      <button
        type="submit"
        className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600"
      >
        {t.enviarBotao}
      </button>
    </form>
  );
}
