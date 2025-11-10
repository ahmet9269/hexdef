# Makefile for white component
PROJECT_NAME=hex_a_white

# Directories
SRC_DIR = src/hex_a
BUILD_DIR = bin
OBJ_DIR = obj
LIB_DIR = lib

# Compiler settings
CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -I$(SRC_DIR) -Ilib/include
LDFLAGS = -L$(LIB_DIR)

# Source files
SOURCES = $(wildcard $(SRC_DIR)/*.cpp) \
          $(wildcard $(SRC_DIR)/adapters/**/*.cpp) \
          $(wildcard $(SRC_DIR)/domain/**/*.cpp)
OBJECTS = $(SOURCES:%.cpp=$(OBJ_DIR)/%.o)
TARGET = $(BUILD_DIR)/$(PROJECT_NAME)

# Default target
all: $(TARGET)

# Build target
$(TARGET): $(OBJECTS)
    @mkdir -p $(BUILD_DIR)
    @echo "Linking $(PROJECT_NAME)..."
    $(CXX) $(OBJECTS) -o $@ $(LDFLAGS)
    @echo "Built: $@"

# Compile source files
$(OBJ_DIR)/%.o: %.cpp
    @mkdir -p $(dir $@)
    @echo "Compiling $<..."
    $(CXX) $(CXXFLAGS) -c $< -o $@

# Clean build artifacts
clean:
    @echo "Cleaning $(PROJECT_NAME)..."
    @rm -rf $(OBJ_DIR)
    @rm -f $(TARGET)

# Run tests
test:
    @echo "Running tests for $(PROJECT_NAME)..."

.PHONY: all clean test