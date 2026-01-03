module github.com/bookkeep/tenant-service

go 1.25

require (
	github.com/bookkeep/go-shared v0.0.0
	github.com/gin-gonic/gin v1.9.1
	github.com/google/uuid v1.6.0
	github.com/lib/pq v1.10.9
	gorm.io/gorm v1.25.7
)

replace github.com/bookkeep/go-shared => ../../packages/go-shared
