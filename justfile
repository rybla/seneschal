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
    bun --env-file=.env.test test --timeout 30000
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
    PORT=3001 bun src/server.ts & sleep 2; kill $!
    @echo "Successfully was able to start development server."

validate_begin:
    @echo
    @echo "Running all code validation..."

validate_end:
    @echo
    @echo "Successfully completed all code validation."

create_changelog_entry:
    @echo
    @echo "Now you must create a changelog entry to log your changes. To do so, create a file in the \"./changelogs/\" directory with the name \"$(date +"%Y-%m-%d-%H-%M-%S") - <label>.md\", where <label> is a short phrase that serves as a label for your changelog entry. The file should contain an overview of your changes, including short code snippets."
    @echo
    @echo "Once you have created the changelog entry, use \"git\" to commit all of your changes like so:\n\n    git add -A ; git commit -m \"<label>\"\n\nwhere label is the label you used for your changelog entry."

validate_ncl: validate_begin lint typecheck test build test_start_development_server validate_end

validate: validate_begin lint typecheck test build test_start_development_server validate_end create_changelog_entry

# Start a development server.
start_development_server:
    bun --hot src/server.ts

dev: start_development_server
