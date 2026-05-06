/**
 * Patches Gradle settings in node_modules when repo.maven.apache.org returns 403:
 * - Prepends Aliyun's Maven Central mirror to pluginManagement.repositories.
 * - Adds dependencyResolutionManagement (Aliyun first) to composite Kotlin settings builds.
 * - Adds settings.gradle.kts to expo-module-gradle-plugin (included build without one).
 * - Strips project `repositories` from expo-module-gradle-plugin/build.gradle.kts (uses settings repos).
 *
 * Keeps Foojay toolchain convention enabled so AGP can auto-provision JDK 17 when needed.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

const settingsTargets = [
  path.join(root, 'node_modules', '@react-native', 'gradle-plugin', 'settings.gradle.kts'),
  path.join(
    root,
    'node_modules',
    'expo-modules-autolinking',
    'android',
    'expo-gradle-plugin',
    'settings.gradle.kts'
  ),
];

const pluginManagementStandard = /pluginManagement\s*\{\s*repositories\s*\{\s*mavenCentral\(\)\s*google\(\)\s*gradlePluginPortal\(\)\s*\}\s*\}/s;

const pluginManagementWithMirror = `pluginManagement {
  repositories {
    maven { url = uri("https://maven.aliyun.com/repository/central") }
    mavenCentral()
    google()
    gradlePluginPortal()
  }
}`;

const dependencyResolutionBlock = `
dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
  repositories {
    maven { url = uri("https://maven.aliyun.com/repository/central") }
    mavenCentral()
    google()
  }
}
`;

function ensureDependencyResolutionManagement(s) {
  if (s.includes('dependencyResolutionManagement')) {
    return s;
  }
  return s.replace(/\ninclude\(/, `\n${dependencyResolutionBlock}\ninclude(`);
}

for (const file of settingsTargets) {
  if (!fs.existsSync(file)) {
    continue;
  }
  const original = fs.readFileSync(file, 'utf8');
  let s = original;
  if (!s.includes('maven.aliyun.com/repository/central') && pluginManagementStandard.test(s)) {
    s = s.replace(pluginManagementStandard, pluginManagementWithMirror);
  }
  s = ensureDependencyResolutionManagement(s);
  if (s !== original) {
    fs.writeFileSync(file, s);
  }
}

const expoModuleGradlePluginDir = path.join(
  root,
  'node_modules',
  'expo-modules-core',
  'expo-module-gradle-plugin'
);
const expoModuleSettings = path.join(expoModuleGradlePluginDir, 'settings.gradle.kts');
const expoModuleBuild = path.join(expoModuleGradlePluginDir, 'build.gradle.kts');

const expoModuleSettingsBody = `// Added by BatEyes postinstall when Maven Central is unreachable (403).
pluginManagement {
  repositories {
    maven { url = uri("https://maven.aliyun.com/repository/central") }
    mavenCentral()
    google()
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
  repositories {
    maven { url = uri("https://maven.aliyun.com/repository/central") }
    mavenCentral()
    google()
  }
}

rootProject.name = "expo-module-gradle-plugin"
`;

if (fs.existsSync(expoModuleGradlePluginDir)) {
  if (!fs.existsSync(expoModuleSettings)) {
    fs.writeFileSync(expoModuleSettings, expoModuleSettingsBody);
  } else {
    const cur = fs.readFileSync(expoModuleSettings, 'utf8');
    if (!cur.includes('maven.aliyun.com/repository/central')) {
      fs.writeFileSync(expoModuleSettings, expoModuleSettingsBody);
    }
  }
  if (fs.existsSync(expoModuleBuild)) {
    let bc = fs.readFileSync(expoModuleBuild, 'utf8');
    if (!bc.includes('BATYES_EXPO_MODULE_USE_SETTINGS_REPOS')) {
      bc = bc.replace(
        /repositories\s*\{\s*google\(\)\s*mavenCentral\(\)\s*\}\s*\n/,
        '// BATYES_EXPO_MODULE_USE_SETTINGS_REPOS\n'
      );
      fs.writeFileSync(expoModuleBuild, bc);
    }
  }
}
