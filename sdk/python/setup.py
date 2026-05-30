"""
Veri Merkezi WhatsApp Business API — Resmî Python SDK
"""
from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read() if fh.readable() else "Veri Merkezi WhatsApp SDK"

setup(
    name="verimerkezi",
    version="1.0.0",
    author="Veri Merkezi",
    author_email="bilgi@verimerkezi.app",
    description="Veri Merkezi WhatsApp Business API — Resmî Python SDK",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://api.verimerkezi.app",
    project_urls={
        "Documentation": "https://api.verimerkezi.app/docs/wa",
        "Source": "https://github.com/verimerkeziapp/whatsapp-sdk",
        "Bug Tracker": "https://github.com/verimerkeziapp/whatsapp-sdk/issues",
    },
    packages=find_packages(exclude=["tests*"]),
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Communications :: Chat",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.9",
    install_requires=[
        "requests>=2.28.0",
    ],
    extras_require={
        "async": ["httpx>=0.24.0"],
    },
    keywords="whatsapp business api meta bsp tech-provider messaging turkey",
    license="MIT",
)
