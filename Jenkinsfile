pipeline {

    agent any

    stages {

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t bike-app:${env.BUILD_NUMBER} -t bike-app:latest ."
            }
        }

        stage('Stop Existing Container') {
            steps {
                sh 'docker rm -f bike-container || true'
            }
        }

        stage('Run Docker Container') {
            steps {
                sh 'curl -f http://host.docker.internal:3000/login.html || exit 1'
            }
        }

        stage('Health Check') {
            steps {
                sh 'sleep 5'
                sh 'curl -f http://localhost:3000/login.html || exit 1'
            }
        }

    }

    post {
        success {
            echo "Deployment Successful - bike-app:${env.BUILD_NUMBER} is live and responding"
        }

        failure {
            echo 'Pipeline Failed - see the failed stage above for details'
        }
    }

}
