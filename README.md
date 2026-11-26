# ⚖️ Pepita Painel Jurídico

Sistema web full-stack de gestão para escritórios de advocacia, desenvolvido para centralizar o controle de clientes, processos, prazos, agenda de consultas, alertas diários por e-mail e atendimento inteligente com a **Pepita IA** (com suporte a planos **Essencial** e **Pepita Pro** via Mercado Pago).

---

## ✨ Funcionalidades Principais

- **Autenticação & Perfil do Advogado:** Cadastro e login com JWT, vinculação de registro OAB e sincronização automática do plano (`FREE` ou `PRO`).
- **Gestão de Clientes & Documentos:** Cadastro completo (CPF, RG, estado civil, profissão, tipo de caso, controle de honorários) e upload/anexo de documentos por cliente.
- **Processos & Controle de Prazos:** Acompanhamento por número CNJ/CNF, área jurídica, prioridades, datas de vencimento e histórico de andamentos.
- **Agenda & Consultas:** Agendamento de atendimentos **Presenciais** ou **Online**, filtros por modalidade, vínculo com o cliente e registro de anotações pós-atendimento.
- **Pepita — Assistente Jurídica IA:**
  - Chat contextualizado com os prazos, processos e consultas reais do escritório.
  - Seleção de cliente específico para contexto direto na conversa.
  - Histórico persistente de conversas salvas no banco de dados.
  - **Pepita Pro:** Limite estendido de tokens (até 1.800), análise estratégica aprofundada, minutas detalhadas e cascata de modelos com fallback robusto (`Gemini` + `Gemma 4 31B`).
- **Assinatura Pepita Pro (Mercado Pago):** Checkout integrado com pagamento via **Cartão** e **Pix QR Code** (Copia e Cola + verificação automática e webhook).
- **Alertas Automáticos Diários:** Agendamento via `node-cron` (todos os dias às 08h, horário de Brasília) com resumo de prazos e compromissos enviado por e-mail.

---

## 🛠️ Stack Tecnológica

### Frontend
- **React** + **TypeScript** + **Vite**
- **Tailwind CSS** (suporte a Dark Mode e Light Mode)
- **GSAP** (animações e modais 3D interativos)
- **Axios** & **React Hot Toast**
- **Lucide React**

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** + **PostgreSQL** (Neon Database)
- **Google GenAI SDK** (`@google/genai`)
- **Mercado Pago SDK** (`mercadopago`)
- **JWT (`jsonwebtoken`)** & **Bcrypt (`bcryptjs`)**
- **Node-Cron** & serviço de envio de e-mail transacional

---
