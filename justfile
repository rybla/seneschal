install_dependencies:
    @echo
    @echo "Installing all dependencies..."
    bun install

setup_database:
    bun drizzle-kit generate

migrate_database:
    bun drizzle-kit migrate

lint: install_dependencies
    @echo
    @echo "Linting codebase..."
    bun eslint src --format codeframe --fix
    @echo "Successfully linted codebase."

typecheck: install_dependencies
    @echo
    @echo "Typechecking codebase..."
    bun tsc --noEmit
    @echo "Successfully typechecked codebase."

test:
    @echo
    @echo "Running tests..."
    bun test
    @echo "Successfully ran tests."

validate_begin:
    @echo
    @echo "Running all code validation..."

validate_end:
    @echo
    @echo "Successfully completed all code validation."

validate: validate_begin lint typecheck test validate_end

# Start a development server.
start_development_server: validate
    bun --hot src/index.ts

dev: start_development_server

# Start a production server.
start_production_server:
    NODE_ENV=production bun src/index.ts

prod: start_production_server
