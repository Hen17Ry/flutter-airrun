cmake_minimum_required(VERSION 3.20)

project(
  airrun_pair_helper
  VERSION 0.1.0
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
