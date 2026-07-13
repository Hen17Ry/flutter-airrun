#include <cerrno>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

#if defined(_WIN32)
#include <bcrypt.h>
#include <windows.h>
#elif defined(__APPLE__)
#include <Security/Security.h>
#elif defined(__linux__)
#include <sys/random.h>
#endif

namespace {

constexpr std::string_view kHelperVersion = "0.2.0";
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

std::string escapeJson(std::string_view value) {
  constexpr char kHex[] = "0123456789abcdef";

  std::string escaped;
  escaped.reserve(value.size());

  for (const char character : value) {
    const auto byte =
        static_cast<unsigned char>(character);

    switch (character) {
      case '"':
        escaped += "\\\"";
        break;

      case '\\':
        escaped += "\\\\";
        break;

      case '\b':
        escaped += "\\b";
        break;

      case '\f':
        escaped += "\\f";
        break;

      case '\n':
        escaped += "\\n";
        break;

      case '\r':
        escaped += "\\r";
        break;

      case '\t':
        escaped += "\\t";
        break;

      default:
        if (byte < 0x20U) {
          escaped += "\\u00";
          escaped += kHex[(byte >> 4U) & 0x0FU];
          escaped += kHex[byte & 0x0FU];
        } else {
          escaped += character;
        }
    }
  }

  return escaped;
}

void fillRandomBytes(
    std::vector<std::uint8_t>& bytes) {
  if (bytes.empty()) {
    return;
  }

#if defined(_WIN32)
  if (
      bytes.size() >
      static_cast<std::size_t>(
          std::numeric_limits<ULONG>::max())) {
    throw std::runtime_error(
        "Requested random buffer is too large");
  }

  const NTSTATUS status = BCryptGenRandom(
      nullptr,
      bytes.data(),
      static_cast<ULONG>(bytes.size()),
      BCRYPT_USE_SYSTEM_PREFERRED_RNG);

  if (status != 0) {
    throw std::runtime_error(
        "BCryptGenRandom failed");
  }

#elif defined(__APPLE__)
  const int status = SecRandomCopyBytes(
      kSecRandomDefault,
      bytes.size(),
      bytes.data());

  if (status != errSecSuccess) {
    throw std::runtime_error(
        "SecRandomCopyBytes failed");
  }

#elif defined(__linux__)
  std::size_t offset = 0;

  while (offset < bytes.size()) {
    const ssize_t count = getrandom(
        bytes.data() + offset,
        bytes.size() - offset,
        0);

    if (count < 0) {
      if (errno == EINTR) {
        continue;
      }

      throw std::runtime_error(
          "getrandom failed");
    }

    if (count == 0) {
      throw std::runtime_error(
          "getrandom returned no data");
    }

    offset += static_cast<std::size_t>(count);
  }

#else
  throw std::runtime_error(
      "Secure random generation is unsupported");
#endif
}

std::string randomHex(
    const std::size_t byteCount) {
  constexpr char kHex[] =
      "0123456789abcdef";

  std::vector<std::uint8_t> bytes(
      byteCount);

  fillRandomBytes(bytes);

  std::string result;
  result.reserve(bytes.size() * 2U);

  for (const std::uint8_t byte : bytes) {
    result += kHex[(byte >> 4U) & 0x0FU];
    result += kHex[byte & 0x0FU];
  }

  return result;
}

void printVersion() {
  std::cout
      << "{"
      << "\"type\":\"version\","
      << "\"protocolVersion\":"
      << kProtocolVersion << ","
      << "\"helperVersion\":\""
      << kHelperVersion << "\""
      << "}"
      << '\n';
}

void printDoctor() {
  std::cout
      << "{"
      << "\"type\":\"doctor_result\","
      << "\"protocolVersion\":"
      << kProtocolVersion << ","
      << "\"helperVersion\":\""
      << kHelperVersion << "\","
      << "\"platform\":\""
      << detectPlatform() << "\","
      << "\"architecture\":\""
      << detectArchitecture() << "\","
      << "\"status\":\"ok\""
      << "}"
      << '\n';
}

void printQrSession() {
  const std::string serviceName =
      "airrun-" + randomHex(6);

  /*
   * 16 octets aléatoires donnent un secret
   * temporaire de 128 bits, encodé en hexadécimal.
   */
  const std::string password =
      randomHex(16);

  const std::string qrPayload =
      "WIFI:T:ADB;S:" +
      serviceName +
      ";P:" +
      password +
      ";;";

  std::cout
      << "{"
      << "\"type\":\"qr_session\","
      << "\"protocolVersion\":"
      << kProtocolVersion << ","
      << "\"helperVersion\":\""
      << kHelperVersion << "\","
      << "\"serviceName\":\""
      << escapeJson(serviceName) << "\","
      << "\"password\":\""
      << escapeJson(password) << "\","
      << "\"qrPayload\":\""
      << escapeJson(qrPayload) << "\""
      << "}"
      << '\n';
}

void printError(
    std::string_view code,
    std::string_view message) {
  std::cerr
      << "{"
      << "\"type\":\"error\","
      << "\"protocolVersion\":"
      << kProtocolVersion << ","
      << "\"code\":\""
      << escapeJson(code) << "\","
      << "\"message\":\""
      << escapeJson(message) << "\""
      << "}"
      << '\n';
}

}  // namespace

int main(int argc, char* argv[]) {
  try {
    if (argc < 2) {
      printDoctor();
      return 0;
    }

    const std::string command = argv[1];

    if (
        command == "--version" ||
        command == "version") {
      printVersion();
      return 0;
    }

    if (command == "doctor") {
      printDoctor();
      return 0;
    }

    if (command == "qr-session") {
      printQrSession();
      return 0;
    }

    printError(
        "UNKNOWN_COMMAND",
        "Unknown helper command");

    return 2;
  } catch (const std::exception& error) {
    printError(
        "HELPER_FAILURE",
        error.what());

    return 1;
  }
}
