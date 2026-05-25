# Nexus Observability Lab 🚀

![SRE](https://img.shields.io/badge/Focus-SRE%20%26%20Observability-blue)
![Docker](https://img.shields.io/badge/Environment-Docker%20Compose-blue?logo=docker)
![Status](https://img.shields.io/badge/Status-Production%20Ready-green)

O **Nexus Observability Lab** é uma plataforma acadêmica de alta fidelidade projetada para demonstrar os pilares da observabilidade moderna (**Métricas, Logs e Rastreamento**) em um ambiente distribuído. O projeto simula um sistema real de gerenciamento de membros (CRUD + Login) integrado a uma stack SRE completa.

## 🏛 Arquitetura do Sistema

A infraestrutura é baseada em containers Docker, orquestrada via Docker Compose, composta pelos seguintes serviços:

*   **Nexus API (Node.js)**: Aplicação alvo instrumentada com `prom-client` e logs estruturados JSON.
*   **Prometheus**: Coletor de métricas temporais (CPU, RAM, Latência, Requests).
*   **Grafana Loki**: Agregador de logs otimizado para ingestão de alta performance.
*   **Promtail**: Agente de coleta de logs que transforma metadados Docker em labels do Loki.
*   **Node Exporter**: Coletor de métricas de hardware do sistema host.
*   **Grafana**: Painel centralizador para visualização de dados e análise de incidentes.

## 🛠 Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Backend** | Node.js v20 (Alpine), Express |
| **Interface** | HTML5, CSS3 (Modern Light UI), Lucide Icons |
| **Métricas** | Prometheus |
| **Logs** | Grafana Loki + Promtail |
| **Visualização** | Grafana |
| **Infraestrutura** | Docker & Docker Compose |

## 📊 Observabilidade SRE

A aplicação foi projetada para gerar dados ricos para análise:
- **Logs Estruturados**: Todo evento gera um JSON contendo `timestamp`, `level`, `event`, `method`, `status`, `response_time_ms` e um `request_id` único para correlação.
- **Instrumentação Nativa**: Exposição de métricas no padrão Prometheus via endpoint `/metrics`.
- **Métricas Customizadas**: Contagem de falhas de login, taxas de erro HTTP e histogramas de latência.

## 🚀 Como Iniciar

### Pré-requisitos
*   Docker instalado
*   Docker Compose instalado

### Inicialização Rápida
1.  Clone o repositório.
2.  Na raiz do projeto, execute:
    ```bash
    docker compose up -d --build
    ```
3.  Aguarde alguns segundos para a inicialização dos serviços.

### Acessos Locais
*   **Aplicação Nexus**: [http://localhost:3000](http://localhost:3000)
*   **Grafana**: [http://localhost:3001](http://localhost:3001) (User: `admin` | Pass: `admin`)
*   **Prometheus**: [http://localhost:9090](http://localhost:9090)

## 🧪 Simulação de Incidentes (Protocolo de Teste)

Para validar a observabilidade no Grafana:
1.  **Geração de Tráfego**: Realize cadastros e logins na interface.
2.  **Simulação de Falha**: Clique no botão **"Simular Erro 500"** na interface para gerar logs de nível `ERROR`.
3.  **Segurança**: Tente logar com credenciais inválidas para observar a métrica `USER_LOGIN_FAILED`.
4.  **Análise**: No Grafana, acesse o painel **Explore** e utilize o datasource **Loki** para filtrar logs por label (ex: `{event="INTERNAL_SERVER_ERROR"}`).

## 📁 Estrutura do Projeto

```text
.
├── app/                  # Código fonte do Produto Nexus
├── config/               # Configurações da Stack de Monitoramento
│   ├── grafana/          # Provisionamento de Datasources
│   ├── loki/             # Configuração de retenção e storage
│   ├── prometheus/       # Configuração de Scrape e Targets
│   └── promtail/         # Pipeline de processamento de logs JSON
├── dashboard-export/     # Backups de Dashboards Grafana
├── Dockerfile            # Imagem otimizada da aplicação
└── docker-compose.yml    # Orquestração de toda a infraestrutura
```

---
Este projeto foi desenvolvido para fins acadêmicos e demonstração de conceitos de **Gerência de Redes e Observabilidade SRE**.
