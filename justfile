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

clean_build:
    @echo
    @echo "Cleaning build directory..."
    rm -rf ./dist
    @echo "Successfully cleaned build directory."

build: lint typecheck test clean_build
    @echo
    @echo "Bundling pages..."
    bun build ./src/pages/*.html --outdir ./dist
    @echo "Successfully bundled pages."

test_start_development_server: build
    @echo
    @echo "Trying to start development server..."
    bun src/server.ts & sleep 2; kill $!
    @echo "Successfully was able to start development server."

validate_begin:
    @echo
    @echo "Running all code validation..."

validate_end:
    @echo
    @echo "Successfully completed all code validation."

create_changelog_entry:
    @echo "Beginning to create new changlog entry"
    @read -p "Enter a short phrase as a label for your changlog entry: " label ; read -p "Enter a 1-paragraph description of the changes: " content ; echo "## $label\n\n$content\n" > "./changelogs/$(date +"%Y-%m-%d-%H-%M-%S") - $label.md" ; git add -A ; git commit -m "$label: $content"
    @echo "Successfully created new changlog entry."

validate: validate_begin lint typecheck test build test_start_development_server create_changelog_entry validate_end

# Start a development server.
start_development_server: validate
    bun --hot src/server.ts

dev: start_development_server

# Start a production server.
start_production_server: validate
    NODE_ENV=production bun src/server.ts

prod: start_production_server
