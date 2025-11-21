# t_hexagon

**Pseudo App Name:** t_hex
**Database:** kafka

Hexagonal Architecture project with multiple components.

## Project Structure

```
t_hexagon/
├── src/           # Source code
│   ├── app/       # Application layer
│   ├── dark/      # Dark theme component
│   └── white/     # White theme component
├── lib/           # Libraries
├── bin/           # Compiled binaries
├── doc/           # Documentation
├── deploy/        # Deployment files
├── etc/           # Configuration files
└── Makefile       # Build configuration
```

## Build

```bash
make build
```

## Clean

```bash
make clean
```

## Install

```bash
make install
```

## Test

```bash
make test
```
