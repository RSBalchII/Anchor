#!/usr/bin/env python3
"""
Combined Model Verification Script for Anchor Core

This script combines functionality from the separate verification scripts:
- Hugging Face availability checking
- Local model file verification
- Complete verification pipeline

Usage:
  python verify_models.py --online                    # Check only Hugging Face availability
  python verify_models.py --local                     # Check only local availability
  python verify_models.py                             # Complete verification (default)
  python verify_models.py --models [model1 model2]    # Check specific models
"""

import requests
import sys
import time
import json
import os
from urllib.parse import urljoin
from pathlib import Path


class ModelVerifier:
    def __init__(self, models_dir="models", base_url="http://localhost:8000", token="sovereign-secret"):
        self.models_dir = Path(models_dir)
        self.base_url = base_url
        self.token = token
        self.headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        })
        self.results = {}

    def test_hf_model_availability(self, model_id, expected_files=None):
        """Test if a model is available on Hugging Face by checking required files"""
        print(f"  Testing Hugging Face availability: {model_id}")

        if expected_files is None:
            # Default MLC-LLM required files
            expected_files = [
                "ndarray-cache.json",
                "tokenizer.json", 
                "mlc-chat-config.json",
                "tokenizer_config.json"
            ]

        model_result = {
            "huggingface": {
                "available": True,
                "files": {},
                "huggingface_url": f"https://huggingface.co/{model_id}"
            }
        }

        missing_files = []

        for file_name in expected_files:
            hf_url = f"https://huggingface.co/{model_id}/resolve/main/{file_name}"

            try:
                response = self.session.head(hf_url, timeout=15)

                file_status = {
                    "url": hf_url,
                    "status_code": response.status_code,
                    "exists": response.status_code in [200, 302, 307],  # 302/307 are redirects, meaning file exists
                    "checked_at": time.time()
                }

                model_result["huggingface"]["files"][file_name] = file_status

                if response.status_code in [200, 302, 307]:
                    print(f"    OK {file_name}")
                elif response.status_code == 404:
                    print(f"    MISSING {file_name} - NOT FOUND on Hugging Face")
                    missing_files.append(file_name)
                    model_result["huggingface"]["available"] = False
                else:
                    print(f"    WARNING {file_name} - Status {response.status_code}")
                    model_result["huggingface"]["available"] = False

            except requests.exceptions.RequestException as e:
                file_status = {
                    "url": hf_url,
                    "status_code": "ERROR",
                    "exists": False,
                    "error": str(e),
                    "checked_at": time.time()
                }
                model_result["huggingface"]["files"][file_name] = file_status
                print(f"    ERROR {file_name} - {e}")
                model_result["huggingface"]["available"] = False

        if missing_files:
            print(f"    INFO Missing files on Hugging Face: {len(missing_files)} required files not found")
        else:
            print(f"    SUCCESS Available on Hugging Face!")

        return model_result["huggingface"]

    def test_local_model_availability(self, model_name):
        """Test if a model is available locally by checking required files"""
        print(f"  Testing local availability: {model_name}")

        # Define the required model files for MLC-LLM
        required_files = [
            "ndarray-cache.json",
            "tokenizer.json",
            "mlc-chat-config.json", 
            "tokenizer_config.json"
        ]

        model_path = self.models_dir / model_name
        if not model_path.exists():
            print(f"    MISSING Model directory does not exist: {model_path}")
            return {
                "available": False,
                "directory_exists": False,
                "files": {},
                "reason": "Model directory does not exist"
            }

        model_result = {
            "available": True,
            "directory_exists": True,
            "files": {},
            "reason": "All required files present"
        }

        missing_files = []

        # Check standard files
        for file_name in required_files:
            file_path = model_path / file_name
            file_exists = file_path.exists()

            file_status = {
                "path": str(file_path),
                "exists": file_exists,
                "checked_at": time.time()
            }

            model_result["files"][file_name] = file_status

            if file_exists:
                print(f"    OK {file_name}")
            else:
                print(f"    MISSING {file_name}")
                missing_files.append(file_name)
                model_result["available"] = False
                model_result["reason"] = f"Missing required file: {file_name}"

        if missing_files:
            print(f"    INFO Missing files locally: {len(missing_files)} required files not found")
        else:
            print(f"    SUCCESS Available locally!")

        return model_result

    def run_hf_verification_only(self, model_list):
        """Run only Hugging Face availability tests"""
        print("Running Hugging Face Model Availability Tests")
        print("=" * 60)

        available_models = []
        unavailable_models = []

        for model_id in model_list:
            print(f"\nTesting: {model_id}")
            result = self.test_hf_model_availability(model_id)

            if result["available"]:
                available_models.append(model_id)
                print(f"  RESULT: AVAILABLE on Hugging Face")
            else:
                unavailable_models.append(model_id)
                print(f"  RESULT: NOT AVAILABLE on Hugging Face")

        print("\n" + "="*60)
        print("HUGGING FACE VERIFICATION SUMMARY:")
        print(f"  Available Models: {len(available_models)}")
        for model in available_models:
            print(f"    OK {model}")

        print(f"  Unavailable Models: {len(unavailable_models)}")
        for model in unavailable_models:
            print(f"    MISSING {model}")

        return available_models, unavailable_models

    def run_local_verification_only(self, model_list):
        """Run only local availability tests"""
        print("Running Local Model Availability Tests")
        print("=" * 60)

        available_models = []
        unavailable_models = []

        for model_name in model_list:
            print(f"\nTesting: {model_name}")
            result = self.test_local_model_availability(model_name)

            if result["available"]:
                available_models.append(model_name)
                print(f"  RESULT: AVAILABLE locally")
            else:
                unavailable_models.append(model_name)
                print(f"  RESULT: NOT AVAILABLE locally - {result.get('reason', 'Unknown reason')}")

        print("\n" + "="*60)
        print("LOCAL VERIFICATION SUMMARY:")
        print(f"  Available Models: {len(available_models)}")
        for model in available_models:
            print(f"    OK {model}")

        print(f"  Unavailable Models: {len(unavailable_models)}")
        for model in unavailable_models:
            print(f"    MISSING {model}")

        return available_models, unavailable_models

    def run_complete_verification(self, model_list):
        """Run complete verification tests (Hugging Face + Local)"""
        print("Running Complete Model Verification Tests")
        print("Phase 1: Hugging Face availability check")
        print("Phase 2: Local file availability check")
        print("=" * 80)

        results = []
        available_locally = []
        download_required = []
        completely_unavailable = []

        for model_id in model_list:
            print(f"\nVerifying model: {model_id}")
            print("-" * 50)

            # Extract model name from model_id (remove mlc-ai/ prefix if present)
            model_name = model_id.split('/')[-1] if '/' in model_id else model_id

            verification_result = {
                "model_id": model_id,
                "model_name": model_name,
                "huggingface": None,
                "local": None,
                "overall_status": "UNKNOWN",
                "recommendation": "UNKNOWN"
            }

            # Step 1: Check Hugging Face availability
            hf_result = self.test_hf_model_availability(model_id)
            verification_result["huggingface"] = hf_result

            if not hf_result["available"]:
                verification_result["overall_status"] = "UNAVAILABLE"
                verification_result["recommendation"] = "Model not available on Hugging Face - cannot proceed"
                print(f"  ERROR: Model not available on Hugging Face")
                completely_unavailable.append(model_id)
                results.append(verification_result)
                continue

            # Step 2: Check local availability
            local_result = self.test_local_model_availability(model_name)
            verification_result["local"] = local_result

            # Determine overall status
            if local_result["available"]:
                verification_result["overall_status"] = "AVAILABLE_LOCALLY"
                verification_result["recommendation"] = "Ready to use - available locally"
                available_locally.append(model_id)
            else:
                verification_result["overall_status"] = "DOWNLOAD_REQUIRED"
                verification_result["recommendation"] = "Not available locally, needs download via /v1/models/pull"
                download_required.append(model_id)

            print(f"  Overall Status: {verification_result['overall_status']}")
            print(f"  Recommendation: {verification_result['recommendation']}")

            results.append(verification_result)

        # Final summary
        print("\n" + "="*80)
        print("COMPLETE VERIFICATION SUMMARY:")

        if available_locally:
            print(f"\n✅ AVAILABLE LOCALLY - Ready to use immediately:")
            for model in available_locally:
                print(f"    {model}")

        if download_required:
            print(f"\nDOWNLOAD REQUIRED - Use /v1/models/pull to download:")
            for model in download_required:
                print(f"    {model}")

        if completely_unavailable:
            print(f"\nCOMPLETELY UNAVAILABLE - Not on Hugging Face:")
            for model in completely_unavailable:
                print(f"    {model}")

        print(f"\nTOTALS:")
        print(f"  Models tested: {len(model_list)}")
        print(f"  Available locally: {len(available_locally)}")
        print(f"  Need download: {len(download_required)}")
        print(f"  Completely unavailable: {len(completely_unavailable)}")

        return results, {
            "available_locally": available_locally,
            "download_required": download_required,
            "completely_unavailable": completely_unavailable
        }


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Model Verification for Anchor Core")
    parser.add_argument("--online", action="store_true",
                       help="Check only Hugging Face availability")
    parser.add_argument("--local", action="store_true", 
                       help="Check only local availability")
    parser.add_argument("--models", nargs="+",
                       help="Specific models to test (default: predefined list)")
    parser.add_argument("--models-dir", default="models",
                       help="Models directory path (default: models)")
    parser.add_argument("--url", default="http://localhost:8000",
                       help="Base URL of the Anchor Core (default: http://localhost:8000)")
    parser.add_argument("--token", default="sovereign-secret",
                       help="Authentication token (default: sovereign-secret)")
    parser.add_argument("--output",
                       help="Output file for verification report (JSON format)")

    args = parser.parse_args()

    verifier = ModelVerifier(
        models_dir=args.models_dir,
        base_url=args.url,
        token=args.token
    )

    # Default model list if none provided
    default_models = [
        "mlc-ai/Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC",
        "mlc-ai/Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC", 
        "mlc-ai/Qwen2.5-7B-Instruct-q4f16_1-MLC",
        "mlc-ai/DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC",
        "mlc-ai/DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC",
        "mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC",
        "mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        "mlc-ai/Llama-3.1-8B-Instruct-q4f32_1-MLC",
        "mlc-ai/gemma-2-9b-it-q4f16_1-MLC",
        "mlc-ai/Phi-3.5-vision-instruct-q4f16_1-MLC"
    ]

    models_to_test = args.models if args.models else default_models

    print(f"Starting model verification for {len(models_to_test)} models...")
    print(f"Mode: {'Online only' if args.online else 'Local only' if args.local else 'Complete'}")
    print(f"Models directory: {args.models_dir}")
    print(f"Server URL: {args.url}")

    if args.online:
        available, unavailable = verifier.run_hf_verification_only(models_to_test)
    elif args.local:
        available, unavailable = verifier.run_local_verification_only(models_to_test)
    else:  # Complete verification (default)
        results, summary = verifier.run_complete_verification(models_to_test)

        if args.output:
            report = {
                "models_dir": args.models_dir,
                "server_url": args.url,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "tested_models": models_to_test,
                "results": results,
                "summary": summary
            }
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"\nComplete verification report saved to: {args.output}")

        # Exit with error code if no models are available at all
        total_available = len(summary["available_locally"])
        if total_available == 0 and args.models:  # Only error if specific models were requested
            print("\nERROR: No requested models are available!")
            sys.exit(1)
        else:
            print(f"\nSUCCESS: {total_available} model(s) are available!")
            sys.exit(0)
        return

    if args.output:
        report = {
            "models_dir": args.models_dir,
            "mode": "online" if args.online else "local",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "tested_models": models_to_test,
            "available_models": available,
            "unavailable_models": unavailable
        }
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\nVerification report saved to: {args.output}")

    # Exit with error code if no models are available
    if not available and args.models:  # Only error if specific models were requested
        print("\nERROR: No requested models are available!")
        sys.exit(1)
    else:
        print(f"\nSUCCESS: {len(available)} model(s) are available!")
        sys.exit(0)


if __name__ == "__main__":
    main()