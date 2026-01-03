module github.com/tesseract-nexus/bookkeeping-app/report-service

go 1.25

require (
	github.com/gin-gonic/gin v1.10.0
	github.com/google/uuid v1.6.0
	github.com/tesseract-nexus/bookkeeping-app/go-shared v0.0.0
	gorm.io/driver/postgres v1.5.11
	gorm.io/gorm v1.25.12
)

replace github.com/tesseract-nexus/bookkeeping-app/go-shared => ../../packages/go-shared
