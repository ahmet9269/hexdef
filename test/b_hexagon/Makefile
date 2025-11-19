# Makefile for b_hexagon
# Pseudo App Name: b_hexx

PROJECT_NAME = b_hexagon
PSEUDO_APP_NAME = b_hexx

# Directories
SRC_DIR = src
BUILD_DIR = bin
LIB_DIR = lib
DOC_DIR = doc
DEPLOY_DIR = deploy

# Compiler settings
CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -I${SRC_DIR}

# Default target
all: build

# Build all components
build:
	@echo "Building b_hexagon..."
	@cd ${SRC_DIR}/app && $(MAKE)
	@cd ${SRC_DIR}/dark && $(MAKE)
	@cd ${SRC_DIR}/white && $(MAKE)

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf ${BUILD_DIR}/*
	@cd ${SRC_DIR}/app && $(MAKE) clean
	@cd ${SRC_DIR}/dark && $(MAKE) clean
	@cd ${SRC_DIR}/white && $(MAKE) clean

# Install to deploy directory
install:
	@echo "Installing to ${DEPLOY_DIR}..."
	@mkdir -p ${DEPLOY_DIR}
	@cp -r ${BUILD_DIR}/* ${DEPLOY_DIR}/

# Run tests
test:
	@echo "Running tests..."
	@cd ${SRC_DIR}/app && $(MAKE) test
	@cd ${SRC_DIR}/dark && $(MAKE) test
	@cd ${SRC_DIR}/white && $(MAKE) test

.PHONY: all build clean install test
