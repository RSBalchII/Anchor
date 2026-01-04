# Running ECE_Core on Android (Termux + PRoot)

You can run the Sovereign Context Engine on Android using **Termux**. Because Android uses a different C library than standard Linux, the best way to run the engine is inside a **PRoot Debian** environment. This ensures the native CozoDB binaries work perfectly.

## Prerequisites

1.  **Install Termux**: Download it from [F-Droid](https://f-droid.org/en/packages/com.termux/).
2.  **Update & Install PRoot**:
    ```bash
    pkg update && pkg upgrade
    pkg install proot-distro lsof
    ```
3.  **Install Debian**:
    ```bash
    proot-distro install debian
    proot-distro login debian
    ```

## Setup Inside Debian (The Linux Container)

Once you are logged into Debian (`root@localhost:~#`), run these commands:

1.  **Install Node.js & Tools**:
    ```bash
    apt update && apt install -y curl git procps
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    ```

2.  **Clone/Transfer Files**:
    ```bash
    git clone <your-repo-url>
    cd ECE_Core/engine
    npm install
    ```

3.  **Get the ARM64 Native Binary**:
    The engine requires the `linux-arm64` version of CozoDB.
    
    ```bash
    # Navigate to the project root
    cd ~/ECE_Core
    
    # Download the CozoDB ARM64 Linux binary (v0.7.6)
    curl -L -o cozo_arm64.tar.gz https://github.com/cozodb/cozo-lib-nodejs/releases/download/v0.7.6/6-linux-arm64.tar.gz
    
    # Extract and rename
    tar -xzf cozo_arm64.tar.gz
    mv cozo_node_prebuilt.node cozo_node.node
    rm cozo_arm64.tar.gz
    ```

4.  **Start the Engine**:
    ```bash
    chmod +x start_engine.sh
    ./start_engine.sh
    ```

## Accessing the Interface

Even though the engine is running inside a "container" (PRoot), it shares the network with your phone.
1. Open Chrome/Firefox on your phone.
2. Go to: `http://localhost:3000`

## Why use PRoot?
Standard Termux cannot run the `linux-arm64` binary directly because it expects `glibc` (standard Linux), while Android uses `Bionic`. **PRoot** provides the `glibc` environment needed for the "Gold Master" binaries to run without modification.
