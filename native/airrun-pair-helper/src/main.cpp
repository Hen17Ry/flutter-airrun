#include <iostream>
#include <string>
#include <string_view>

namespace {

constexpr std::string_view kHelperVersion = "0.1.0";
constexpr int kProtocolVersion = 1;

std::string detectPlatform() {
#if defined(_WIN32)
  return "windows";
#elif defined(__APPLE__)
  return "macos";
#elif defined(__linux__)
  return "linux";
#else
  return "unknown";
#endif
}

std::string detectArchitecture() {
#if defined(__x86_64__) || defined(_M_X64)
  return "x86_64";
#elif defined(__aarch64__) || defined(_M_ARM64)
  return "arm64";
#elif defined(__i386__) || defined(_M_IX86)
  return "x86";
#else
  return "unknown";
#endif
}

void printVersion() {
  std::cout
      << "{"
      << "\"type\":\"version\","
      << "\"protocolVersion\":" << kProtocolVersion << ","
      << "\"helperVersion\":\"" << kHelperVersion << "\""
      << "}"
      << '\n';
}

void printDoctor() {
  std::cout
      << "{"
      << "\"type\":\"doctor_result\","
      << "\"protocolVersion\":" << kProtocolVersion << ","
      << "\"helperVersion\":\"" << kHelperVersion << "\","
      << "\"platform\":\"" << detectPlatform() << "\","
      << "\"architecture\":\"" << detectArchitecture() << "\","
      << "\"status\":\"ok\""
      << "}"
      << '\n';
}

void printError(std::string_view message) {
  std::cerr
      << "{"
      << "\"type\":\"error\","
      << "\"protocolVersion\":" << kProtocolVersion << ","
      << "\"code\":\"UNKNOWN_COMMAND\","
      << "\"message\":\"" << message << "\""
      << "}"
      << '\n';
}

}  // namespace

int main(int argc, char* argv[]) {
  if (argc < 2) {
    printDoctor();
    return 0;
  }

  const std::string command = argv[1];

  if (command == "--version" || command == "version") {
    printVersion();
    return 0;
  }

  if (command == "doctor") {
    printDoctor();
    return 0;
  }

  printError("Unknown helper command");
  return 2;
}
