pipeline {
    agent any

    environment {
        IMAGE_NAME = 'c270-bike-rental-wallet'
        CONTAINER_NAME = 'c270-bike-rental-wallet-ci'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest .'
            }
        }

        stage('Smoke Test Container') {
            steps {
                sh '''
                    docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
                    docker run -d --name ${CONTAINER_NAME} -p 3001:3000 \
                      -e SESSION_SECRET=jenkins-test-secret \
                      ${IMAGE_NAME}:latest

                    for i in $(seq 1 15); do
                      if wget -qO- http://localhost:3001/health | grep -q 'ok'; then
                        echo "Application is healthy"
                        exit 0
                      fi
                      echo "Waiting for app..."
                      sleep 2
                    done

                    echo "Health check failed"
                    docker logs ${CONTAINER_NAME}
                    exit 1
                '''
            }
            post {
                always {
                    sh 'docker rm -f ${CONTAINER_NAME} 2>/dev/null || true'
                }
            }
        }

        stage('Deploy Locally with Ansible') {
            when {
                branch 'main'
            }
            steps {
                sh 'ansible-playbook -i ansible/hosts ansible/deploy.yml || true'
            }
        }
    }
}
