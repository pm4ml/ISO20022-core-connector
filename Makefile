.PHONY: build run

NAME=iso20022-core-connector

default: build

build:
	docker build -t $(NAME) .
run:
	docker-compose up 
