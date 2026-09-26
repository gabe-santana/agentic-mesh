<div align="center">

# 🕸️ AgenticMesh

### Distributed Enterprise AI Agent & RAG Platform

**Chat com streaming em tempo real, RAG sobre seus próprios documentos e um painel de observabilidade que mostra exatamente o que a IA "viu" antes de responder.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant-vector%20search-DC244C)](https://qdrant.tech/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Azure AI Foundry](https://img.shields.io/badge/Azure%20AI%20Foundry-LLM%20provider-0078D4?logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/products/ai-foundry)

[**▶ Assista à demo abaixo**](#-demo) · [Funcionalidades](#-funcionalidades) · [Arquitetura](#-arquitetura-do-sistema) · [Como rodar](#-como-executar-localmente)

</div>

---

## 🎬 Demo

<div align="center">

[![Assista à demo do AgenticMesh](docs/res/video-thumbnail.jpg)](docs/res/video.mp4)

*Clique na imagem para assistir ao vídeo de apresentação (upload/ingestão de PDF → chat com RAG em streaming → painel de trace do pipeline).*

</div>

---

**AgenticMesh** é um ecossistema projetado para orquestrar Agentes de IA autônomos e pipelines de RAG (Retrieval-Augmented Generation) em escala enterprise. A plataforma conta com uma interface moderna em **Next.js** e um backend totalmente construído em **Python (FastAPI)**, usando o **Azure AI Foundry** (endpoint compatível com OpenAI, via SDK `openai`) como provedor de modelos de chat (Responses API) e embeddings.

> **Status:** implementação funcional (MVP) de ponta a ponta — ver [Escopo desta versão](#escopo-desta-versão-mvp) para o que já roda vs. o que é visão futura.

## ✨ Funcionalidades

|  |  |
|---|---|
| 💬 **Chat com streaming (SSE)** | Respostas token a token, renderizadas em **Markdown** (tabelas, listas, código) em tempo real. |
| 📚 **RAG sobre seus documentos** | Upload de `.txt` / `.md` / `.pdf` → chunking → embeddings → Qdrant. O agente busca e cita as fontes `[n]` na resposta. |
| 🔍 **Painel de "Pipeline Trace"** | Por trás de cada resposta: tempo de retrieval vs. geração, os chunks recuperados com score de similaridade, e o **prompt de sistema exato** enviado ao modelo. Nada de caixa-preta. |
| 🔐 **Auth JWT** | Registro/login simples, sessões de chat isoladas por usuário. |
| 🗑️ **Gestão completa** | Apagar chats e documentos (incluindo seus vetores no Qdrant) direto da UI. |
| 🐳 **100% dockerizado** | `docker compose up` sobe os 6 serviços — nenhuma dependência local além do Docker. |

## 📸 Screenshots

<div align="center">
<table>
<tr>
<td width="50%">

**Chat com Markdown + Pipeline Trace**
<img src="docs/res/screenshot-chat.png" alt="Chat com resposta em markdown e painel de trace do pipeline" width="100%">

</td>
<td width="50%">

**Gestão de Documentos**
<img src="docs/res/screenshot-documents.png" alt="Página de documentos com status de processamento" width="100%">

</td>
</tr>
</table>
</div>

---

## 🏛️ Arquitetura do Sistema

O sistema é dividido em uma camada de frontend reativa em Next.js e serviços Python (API + worker assíncrono), todos orquestrados via Docker Compose.

```mermaid
graph TD
    A[Frontend - Next.js] -->|REST + SSE| B[FastAPI Backend]
    B -->|SQLAlchemy async| C[(PostgreSQL)]
    B -->|enqueue ingest task| D[(Redis - Celery broker)]

    D -->|consume task| E[Ingestion Worker - Celery]
    E -->|Embeddings| F[Azure AI Foundry]
    E -->|Upsert vectors| G[(Qdrant)]

    B -->|RAG retrieval| G
    B -->|Chat completion - streaming| F
```

### Principais Módulos

| Módulo | Descrição |
|---|---|
| **Frontend** (`frontend/`) | Next.js 14 (App Router, TypeScript, Tailwind): login/registro, chat com streaming e toggle de RAG, upload/listagem de documentos, painel de trace. |
| **API** (`backend/app/api`) | FastAPI assíncrona: autenticação JWT, upload de documentos, endpoints de chat/agent (streaming e histórico), delete de chats/documentos. |
| **Worker** (`backend/app/workers`) | Celery: extração de texto (txt/md/pdf), chunking, embeddings via Azure AI Foundry, upsert no Qdrant — com engine de DB isolada por task (evita corrupção de pool entre execuções). |
| **Agent Core** (`backend/app/agents`) | `RAGChatAgent`: retrieval no Qdrant + geração via Azure AI Foundry, streaming token a token, com timing e prompt completo expostos para o painel de trace. |

## 🛠️ Tech Stack

* **Frontend:** Next.js 14 (React 18, TypeScript, Tailwind CSS, `react-markdown`)
* **Backend Runtime:** Python 3.11+
* **Web Framework:** FastAPI + Uvicorn
* **AI:** Azure AI Foundry — endpoint compatível com OpenAI (chat via Responses API + embeddings via SDK `openai`)
* **Vector Database:** Qdrant
* **Task Queue:** Celery + Redis
* **Database & Cache:** PostgreSQL, Redis
* **Infraestrutura:** Docker, Docker Compose

### Escopo desta versão (MVP)

Simplificações deliberadas em relação à visão de longo prazo do projeto:
* Orquestração de agente é uma classe Python simples (`RAGChatAgent`), não LangGraph/Semantic Kernel.
* Sem RabbitMQ — Redis cobre broker do Celery e cache.
* Sem Alembic — tabelas criadas via `SQLAlchemy.metadata.create_all()` no boot do backend (com auto-patch de colunas novas em bancos já existentes).
* Sem Kubernetes/Terraform — apenas Docker Compose.

---

## 📂 Estrutura do Repositório

```text
agentic-mesh/
├── docs/res/                    # Vídeo de demo e screenshots deste README
├── docker/
│   └── docker-compose.yml       # postgres, redis, qdrant, backend, worker, frontend
├── frontend/                    # App Next.js (chat / documentos / auth)
│   ├── src/
│   │   ├── app/                 # App Router (login, chat, documents)
│   │   ├── components/          # ChatMessageBubble, TracePanel, DocumentList...
│   │   ├── services/            # Cliente API (fetch + parser SSE manual)
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
├── backend/                     # Backend Python (FastAPI + Celery)
│   ├── app/
│   │   ├── api/v1/routes/       # auth, documents, agent, health
│   │   ├── core/                 # config, security (JWT), db (SQLAlchemy async)
│   │   ├── models/               # User, Document, ChatSession, ChatMessage, AgentRun
│   │   ├── schemas/              # Pydantic request/response models
│   │   ├── services/             # azure_ai.py, vector_store.py (Qdrant), rag.py
│   │   ├── agents/               # RAGChatAgent
│   │   ├── workers/              # Celery app + ingest_document_task
│   │   └── main.py
│   └── requirements.txt
├── tests/backend/                # pytest suite
├── .env.example                  # copie para .env e preencha as credenciais
├── README.md
└── LICENSE
```

---

## ⚡ Como Executar Localmente

### Pré-requisitos
* Docker e Docker Compose.
* Um projeto no **Azure AI Foundry** com um deployment de chat (ex.: `gpt-4o-mini`) e um de embeddings (ex.: `text-embedding-3-small`).

### 1. Configurar variáveis de ambiente
```bash
cp .env.example .env
# edite .env e preencha:
#   AZURE_AI_FOUNDRY_ENDPOINT
#   AZURE_AI_FOUNDRY_API_KEY
#   AZURE_AI_FOUNDRY_CHAT_DEPLOYMENT
#   AZURE_AI_FOUNDRY_EMBEDDING_DEPLOYMENT
#   AZURE_AI_FOUNDRY_EMBEDDING_DIMENSIONS (deve bater com o modelo de embedding escolhido)
```

### 2. Subir tudo com Docker Compose
```bash
docker compose -f docker/docker-compose.yml up --build
```

Isso sobe: `postgres`, `redis`, `qdrant`, `backend` (FastAPI, :8000), `worker` (Celery) e `frontend` (Next.js, :3000).

Acesse o app em `http://localhost:3000` e a documentação interativa da API em `http://localhost:8000/docs`.

### Desenvolvimento sem Docker (opcional)
```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# Worker (em outro terminal, mesmo venv)
celery -A app.workers.celery_app worker --loglevel=info

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

Nesse modo, suba pelo menos `postgres`, `redis` e `qdrant` via `docker compose -f docker/docker-compose.yml up postgres redis qdrant` e ajuste as URLs em `.env` para `localhost`.

### Rodando os testes
```bash
cd backend && pip install -r requirements-dev.txt
cd .. && pytest
```

---

## 📄 Exemplo de Uso das APIs (FastAPI)

### Registro e login
```http
POST /api/v1/auth/register
Content-Type: application/json

{ "email": "user@example.com", "password": "super-secret-123" }
```
Retorna `{ "access_token": "...", "token_type": "bearer" }`. Use esse token como `Authorization: Bearer <token>` nas chamadas abaixo.

### Ingestão de Documentos (RAG Pipeline)
```http
POST /api/v1/documents/ingest?category=architecture
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [arquivo.pdf]
```

### Consulta ao Agente via Stream SSE
```http
POST /api/v1/agent/stream
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "Analise a arquitetura do projeto e identifique potenciais gargalos de concorrência.",
  "enable_rag": true,
  "agent_type": "rag_chat"
}
```
Resposta em `text/event-stream`: eventos `{"type":"token","content":"..."}` token a token, seguidos de `{"type":"done","sources":[...],"system_prompt":"...","timing":{...}}` — os mesmos dados que alimentam o painel de trace no frontend.

---

## 🤝 Contribuição

Contribuições são super bem-vindas! Sinta-se à vontade para abrir **Issues** ou enviar **Pull Requests**.

1. Faça o Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: nova funcionalidade'`)
4. Push para a Branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📜 Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE) para mais informações.

<div align="center">

Feito com 🕸️ por Gabriel Santana

</div>
