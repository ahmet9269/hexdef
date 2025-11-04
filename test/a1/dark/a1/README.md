# a1

**Pseudo App Name:** bx
**Database:** TEST_DB

Hexagonal Architecture template project.

## Structure

- **adapters/**: External interface adapters
  - **incoming/**: Input adapters (REST, CLI, etc.)
    - **TEST_DB/**: Database specific adapters
  - **outgoing/**: Output adapters (Database, APIs, etc.)
  - **common/**: Shared utilities
    - **new_datagram/**: Datagram templates
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
