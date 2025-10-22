# White Project

Hexagonal Architecture template project.

## Structure

- **adapters/**: External interface adapters
  - **incoming/**: Input adapters (REST, CLI, etc.)
  - **outgoing/**: Output adapters (Database, APIs, etc.)
  - **common/**: Shared utilities
- **domain/**: Business logic layer
  - **logic/**: Business rules
  - **model/**: Domain models
  - **ports/**: Interface definitions

## Build

```bash
mkdir build && cd build
cmake ..
make
```
