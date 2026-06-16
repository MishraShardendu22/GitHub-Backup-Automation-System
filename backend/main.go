package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/MishraShardendu22/github-backup/backend/db"
	"github.com/MishraShardendu22/github-backup/backend/middleware"
	"github.com/MishraShardendu22/github-backup/backend/routes"
	"github.com/MishraShardendu22/github-backup/backend/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	if err := db.Connect(); err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer db.Close()

	if err := db.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	log.Println("PostgreSQL connected and migrations applied")

	app := fiber.New(fiber.Config{
		AppName:      "GitHub Backup Monitor",
		BodyLimit:    10 * 1024 * 1024,
		ServerHeader: "GBM",
	})

	app.Use(middleware.SetupCORS())
	app.Use(middleware.SetupLogger())

	app.Options("/*", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	routes.Setup(app)

	websocket.DefaultHub.StartPolling()

	port := "8080"
	if port == "" {
		port = "8080"
	}

	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	fmt.Printf("🚀 Backend server running on http://localhost:%s\n", port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	app.Shutdown()
	db.Close()
	log.Println("Server stopped")
}
