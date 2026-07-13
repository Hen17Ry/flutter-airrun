cmake_minimum_required(VERSION 3.20)

project(
  airrun_pair_helper
  VERSION 0.2.0
  LANGUAGES CXX
)

add_executable(
  airrun-pair-helper
  src/main.cpp
)

target_compile_features(
  airrun-pair-helper
  PRIVATE
  cxx_std_20
)

if(MSVC)
  target_compile_options(
    airrun-pair-helper
    PRIVATE
    /W4
    /permissive-
  )
else()
  target_compile_options(
    airrun-pair-helper
    PRIVATE
    -Wall
    -Wextra
    -Wpedantic
    -Wconversion
  )
endif()

if(WIN32)
  target_link_libraries(
    airrun-pair-helper
    PRIVATE
    bcrypt
  )
elseif(APPLE)
  find_library(
    SECURITY_FRAMEWORK
    Security
    REQUIRED
  )

  target_link_libraries(
    airrun-pair-helper
    PRIVATE
    "${SECURITY_FRAMEWORK}"
  )
endif()
