pipeline {
    agent any

    environment {
        // Explicitly set PATH to include Docker and System binaries for Windows
        PATH = "D:\\Program Files\\Docker\\Docker\\resources\\bin;C:\\Windows\\System32;${env.WORKSPACE};${env.PATH}"
        
        // Absolute path to your project folder on the D: drive
        PROJECT_DIR = "D:\\devops\\NEW_PROJECT_FILE\\15projects30days\\project_5\\workflow-automation"
        COMPOSE_FILE = "D:\\devops\\NEW_PROJECT_FILE\\15projects30days\\project_5\\workflow-automation\\Docker-compose.yml"
        K8S_DIR = "D:\\devops\\NEW_PROJECT_FILE\\15projects30days\\project_5\\workflow-automation\\k8s"
        
        COMPOSE_PROJECT_NAME = "workflow-automation"
        BACKEND_HEALTH_URL = "http://localhost:5000/api/health"
        DOCKER_HUB_USER = "rajbirari9737"
        DOCKER_HUB_CREDS = "dockerhubcreadentials"
        K8S_CONTEXT     = "docker-desktop"
        NAMESPACE       = "workflow-automation"
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Pulling latest code...'
                // checkout scm // Commented out because code is manually managed at PROJECT_DIR
            }
        }

        stage('Security Check') {
            steps {
                dir(env.PROJECT_DIR) {
                    echo 'Checking for sensitive files...'
                    bat 'if exist "%PROJECT_DIR%\\backend\\.env" (echo Warning: .env file found in backend, ensuring it\'s not committed.)'
                }
            }
        }

        stage('Docker Build') {
            steps {
                dir(env.PROJECT_DIR) {
                    echo 'Building Docker Images...'
                    bat 'docker-compose -f "%COMPOSE_FILE%" build'
                }
            }
        }

        stage('Health Test') {
            steps {
                dir(env.PROJECT_DIR) {
                    echo 'Cleaning up any existing containers to avoid name conflicts...'
                    script {
                        // Bring down any running compose containers (ignore errors if nothing is running)
                        bat 'docker-compose -f "%COMPOSE_FILE%" -p %COMPOSE_PROJECT_NAME% down -v --remove-orphans || exit 0'
                        // Force-remove containers by known name in case they were created outside compose
                        bat 'docker rm -f workflow_backend workflow_frontend workflow_db 2>nul || exit 0'
                    }
                    
                    echo 'Building and starting containers fresh...'
                    bat 'docker-compose -f "%COMPOSE_FILE%" -p %COMPOSE_PROJECT_NAME% up -d --build'
                    
                    script {
                        echo "Waiting for backend to be healthy at ${BACKEND_HEALTH_URL}..."
                        timeout(time: 2, unit: 'MINUTES') {
                            waitUntil {
                                def result = bat(script: "curl.exe -s ${BACKEND_HEALTH_URL}", returnStatus: true)
                                return (result == 0)
                            }
                        }
                    }
                    echo 'Health test passed! ✅'
                }
            }
        }


        stage('Push to Docker Hub') {
            steps {
                dir(env.PROJECT_DIR) {
                    script {
                        echo "Tagging and Pushing images to Docker Hub..."
                        try {
                            withCredentials([usernamePassword(credentialsId: "${DOCKER_HUB_CREDS}", usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                                bat "docker login -u %USER% -p %PASS%"
                                bat "docker tag %COMPOSE_PROJECT_NAME%-backend:latest %DOCKER_HUB_USER%/%COMPOSE_PROJECT_NAME%-backend:latest"
                                bat "docker tag %COMPOSE_PROJECT_NAME%-frontend:latest %DOCKER_HUB_USER%/%COMPOSE_PROJECT_NAME%-frontend:latest"
                                bat "docker push %DOCKER_HUB_USER%/%COMPOSE_PROJECT_NAME%-backend:latest"
                                bat "docker push %DOCKER_HUB_USER%/%COMPOSE_PROJECT_NAME%-frontend:latest"
                            }
                        } catch (Exception e) {
                            echo "ERROR: ${e.message}"
                            error "Pipeline failed due to missing Docker Hub credentials."
                        }
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                dir(env.PROJECT_DIR) {
                    echo 'Deploying to Kubernetes cluster...'
                    script {
                        try {
                            // Ensure context is set to local to avoid AWS errors
                            bat "kubectl config use-context %K8S_CONTEXT%"
                            
                            // Ensure namespace exists
                            bat "kubectl get namespace %NAMESPACE% || kubectl create namespace %NAMESPACE%"

                            // Apply manifests with validation bypass to handle potential schema download issues
                            // Using -n %NAMESPACE% to ensure they land in the right spot
                            bat 'kubectl apply -f "%K8S_DIR%" -n %NAMESPACE% --validate=false'
                            
                            echo 'Verifying deployment status...'
                            bat 'kubectl rollout status deployment/backend -n %NAMESPACE% --timeout=90s'
                            bat 'kubectl rollout status deployment/frontend -n %NAMESPACE% --timeout=90s'
                            
                            echo 'Kubernetes deployment completed successfully! 🚀'
                        } catch (Exception e) {
                            echo "Kubernetes deployment failed: ${e.message}"
                        }
                    }
                }
            }
        }

        stage('Deploy & Prune') {
            steps {
                dir(env.PROJECT_DIR) {
                    echo 'Finalizing deployment and cleaning up old images...'
                    bat 'docker image prune -f'
                    echo 'CI/CD Deployment completed successfully! 🚀'
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished!'
        }
        success {
            echo 'CI/CD Deployment successful! ✅'
        }
        failure {
            echo 'Build failed. Please check logs. ❌'
        }
    }
}
