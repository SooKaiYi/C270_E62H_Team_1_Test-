pipeline {

    agent any

    stages {

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Test') {
            steps {
                bat 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat "docker build -t bike-app:%BUILD_NUMBER% -t bike-app:latest ."
            }
        }

        stage('Stop Existing Container') {
            steps {
                bat 'docker rm -f bike-container || exit /b 0'
            }
        }

        stage('Run Docker Container') {
            steps {
                bat "docker run -d -p 3000:3000 --name bike-container bike-app:%BUILD_NUMBER%"
            }
        }

        stage('Health Check') {
            steps {
                bat 'timeout /t 5'
                bat 'curl -f http://localhost:3000/login.html || exit /b 1'
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
