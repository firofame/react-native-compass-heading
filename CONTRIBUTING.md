# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

Use the Node.js version in `.nvmrc` (Node 24.22.1) and the bundled Yarn 4.18.1.
The example app uses React Native 0.88 with the New Architecture. Native builds
require Xcode 26+ on iOS, or JDK 17+ and Android SDK 36 on Android.

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

To get started with the project, make sure you have the correct version of [Node.js](https://nodejs.org/) installed. See the [`.nvmrc`](./.nvmrc) file for the version used in this project.

Run `yarn` in the root directory to install the required dependencies for each package:

```sh
yarn
```

Install iOS dependencies before building the example:

```sh
cd example
bundle install
bundle exec pod install --project-directory=ios
cd ..
```

The compass requires physical-device sensors. The example displays an explicit
message when `hasCompass()` is false on a simulator or emulator.

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development without manually migrating.

The [example app](/example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

If you want to use Android Studio or Xcode to edit the native code, you can open the `example/android` or `example/ios` directories respectively in those editors. To edit the Objective-C files, open `example/ios/CompassHeadingExample.xcworkspace` in Xcode and find the source files at `Pods > Development Pods > CompassHeading`.

To edit the Java or Kotlin files, open `example/android` in Android studio and find the source files at `react-native-compass-heading` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To run the example app on iOS:

```sh
yarn example ios
```

Make sure your code passes TypeScript:

```sh
yarn typecheck
```

To check for linting errors, run the following:

```sh
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint --fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

CI runs on pushes to `master`, pull requests targeting `master`, and merge queue
checks.

### Dependency security

Check all workspaces and transitive JavaScript dependencies with:

```sh
yarn npm audit --all --recursive --no-deprecations
```

Use `yarn up -R <package>` to refresh affected transitive dependencies within
their existing ranges, preserving parallel major versions. Commit the updated
lockfile and run lint, typechecking, tests, and the package build.

This checks security advisories without treating package deprecations as
vulnerabilities.

The root `resolutions` entries temporarily update `release-it`'s pinned `undici`
dependency to a patched v7 release and `get-uri`'s `basic-ftp` to patched v6.
The FTP update rejects separate transfer hosts by default for security.
Remove these overrides once the parent packages depend on patched versions.

`deepmerge` 4.3.1 has no published fix for GHSA-gcqx-w48m-w2h4. A committed Yarn
patch writes own data properties instead of invoking prototype setters, with
regression coverage in the unit tests. Registry audits still report the original
version because they do not inspect local patches; do not ignore the advisory.
Remove the patch only after upgrading to a verified upstream fix.

The example requires `concurrent-ruby` 1.3.7 or newer. Keep that security floor
when updating its Ruby dependencies, and validate CocoaPods with
`bundle exec pod --version` from `example/`.

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module.
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.


### Publishing to npm

We use [release-it](https://github.com/release-it/release-it) to bump the package
version, create a version commit and tag, push them, and create a GitHub release.
The [publishing workflow](./.github/workflows/publish.yml) publishes to
[npmjs](https://www.npmjs.com/package/react-native-compass-heading) automatically
when a version tag such as `v3.0.0` is pushed. Normal branch pushes do not publish.

From an up-to-date, clean `master` branch, set `GITHUB_TOKEN` locally with
permission to create GitHub releases, then run:

```sh
yarn release
```

Version `3.0.0` introduces the New Architecture requirement and is a breaking
change from `2.x`.

The tag must exactly match `v` followed by the version in `package.json`. The
workflow runs lint, typechecking, unit tests, and the package build before
publishing. Stable versions use npm's `latest` tag; prereleases use `next`.

The repository's Actions secret `NODE_AUTH_TOKEN` must contain a valid npm token
with write access to this package and permission to bypass publishing 2FA.
Publishing includes npm provenance. The token is exposed only to the publishing
step, not dependency installation or tests.

Local npm publishing in `release-it` is disabled to avoid publishing the same
version both locally and in Actions. Each release needs a new package version;
npm does not allow overwriting a version that has already been published.

### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with [ESLint](https://eslint.org/).
- `yarn test`: run unit tests with [Jest](https://jestjs.io/).
- `yarn prepare`: build the library's JavaScript and TypeScript declarations.
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
