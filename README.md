# 🚀 Workflow Automation Engine (Zapier Lite)

A powerful, self-hosted workflow automation platform that allows you to create multi-step automations triggered by external webhooks or time-based schedules. Inspired by platforms like Zapier and Make.com.

![Workflow Automation Dashboard](./photo/1.png)

## ✨ Key Features

-   **Trigger-Action Architecture**: Define complex workflows with a single trigger and multiple actions.
-   **Multiple Trigger Types**:
    -   **Webhook**: Trigger workflows via external POST requests to a unique endpoint.
    -   **Schedule (Cron)**: Run workflows periodically using standard cron syntax.
-   **Extensible Actions**:
    -   **HTTP Request**: Call any external API with custom methods and payloads.
    -   **Task Creation**: Mock action for internal task management.
-   **Execution History**: Detailed logs of every workflow run, including input/output data and success/failure status.
-   **User Management**: Secure authentication using JWT and Bcrypt.
-   **Scalable Backend**: Distributed architecture with dedicated workers and schedulers.

---

## 🏗 Architecture

The system is built using a microservices-inspired architecture to ensure scalability and reliability.

```mermaid
graph TD
    User((User)) -->|Interacts| Frontend[React Frontend]
    Frontend -->|API Calls| Backend[Node.js API]
    External((External Services)) -->|Webhook POST| Backend
    
    Backend -->|Stores Config| Postgres[(PostgreSQL)]
    Backend -->|Enqueues Jobs| Redis[(Redis / Bull)]
    
    Scheduler[Cron Scheduler] -->|Triggers Jobs| Redis
    Redis -->|Processes Tasks| Worker[Background Worker]
    
    Worker -->|Updates Status| Postgres
    Worker -->|Calls| ExternalAPI[External APIs]
```

---

## 🛠 Tech Stack

-   **Frontend**: React, Vite, Axios, React Router.
-   **Backend**: Node.js, Express, Bull (Queue), node-cron.
-   **Database**: PostgreSQL (Data persistence).
-   **Cache/Queue**: Redis (Message broker for workers).
-   **DevOps**: Docker, Docker Compose, Kubernetes, Jenkins.

---

## 🚀 Getting Started

### Prerequisites

-   [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
-   (Optional) [Kubernetes](https://kubernetes.io/) for production deployment.

### Local Development (Docker Compose)

The easiest way to run the entire stack is using Docker Compose.

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd workflow-automation
    ```

2.  **Start the services**:
    ```bash
    docker-compose up -d --build
    ```

3.  **Access the application**:
    -   **Frontend**: [http://localhost:8740](http://localhost:8740)
    -   **Backend API**: [http://localhost:5000](http://localhost:5000)

4.  **Default Credentials**:
    -   **Email**: `admin@example.com`
    -   **Password**: `admin`

---

## ☸️ Kubernetes Deployment

The project includes production-ready Kubernetes manifests in the `k8s/` directory.

### Deploy to local cluster (e.g., Docker Desktop)

1.  **Ensure your context is set**:
    ```bash
    kubectl config use-context docker-desktop
    ```

2.  **Create the namespace**:
    ```bash
    kubectl create namespace workflow-automation
    ```

3.  **Apply manifests**:
    ```bash
    kubectl apply -f k8s/ -n workflow-automation
    ```

4.  **Verify status**:
    ```bash
    kubectl get pods -n workflow-automation
    ```

---

## 🛠 Manual Setup (Development)

If you prefer to run the components manually without Docker:

### Backend
1.  Navigate to `backend/`.
2.  Install dependencies: `npm install`.
3.  Configure `.env` (DATABASE_URL, REDIS_URL, JWT_SECRET).
4.  Run the API: `npm run dev`.
5.  Run the Worker: `npm run worker`.
6.  Run the Scheduler: `npm run scheduler`.

### Frontend
1.  Navigate to `frontend/`.
2.  Install dependencies: `npm install`.
3.  Run the dev server: `npm run dev`.

---

## ⚙️ Environment Variables

The following environment variables are used across the services:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/workflow_automation` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for JWT signing | `supersecret` |
| `PORT` | API server port (Backend) | `5000` |

---

## 🔄 CI/CD Pipeline

The project features a comprehensive Jenkins pipeline (`Jenkinsfile`) that automates:

![Jenkins Pipeline Status](./photo/2.png)

1.  **Security Scans**: Checking for sensitive files.
2.  **Docker Build**: Building frontend and backend images.
3.  **Health Checks**: Spinning up a temporary environment to verify API health.
4.  **Docker Push**: Pushing tagged images to Docker Hub.
5.  **K8s Deployment**: Rolling out updates to the Kubernetes cluster.

---

## 📸 Screenshots

| Dashboard | Workflow Builder | History |
| :---: | :---: | :---: |
| ![Dashboard](./photo/1.png) | ![Builder](./photo/10.png) | ![History](./photo/9.png) |
## 📄 License

This project is licensed under the MIT License.
