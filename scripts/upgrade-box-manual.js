const { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } = require("../helper-hardhat-config")
const { network, deployments, deployer, ethers } = require("hardhat")
const { verify } = require("../helper-functions")

async function main() {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("----------------------------------------------------")

    const boxV2 = await deploy("BoxV2", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(boxV2.address, [])
    }

    // Upgrade!
    // Not "the hardhat-deploy way"
    const boxProxyAdmin = await ethers.getContract("BoxProxyAdmin")
    const transparentProxy = await ethers.getContract("Box_Proxy")

    // before upgrade
    const proxyBoxV1 = await ethers.getContractAt("Box", transparentProxy.address)
    const versionV1 = await proxyBoxV1.version()
    console.log("version_before_upgrade :", versionV1.toString())
    const valueV1 = await proxyBoxV1.store("3")
    console.log("valueV1 :", (await proxyBoxV1.retrieve()).toString())

    // upgrading
    const upgradeTx = await boxProxyAdmin.upgrade(transparentProxy.address, boxV2.address)
    await upgradeTx.wait(1)

    // after upgrade
    const proxyBoxV2 = await ethers.getContractAt("BoxV2", transparentProxy.address) // get the BoxV2 abi, load it at the transparentProxy address
    const versionV2 = await proxyBoxV2.version()
    console.log("version_after_upgrade :", versionV2.toString())
    const valueV2 = await proxyBoxV2.store("3")
    const incrementV2 = await proxyBoxV2.increment()
    console.log("valueV2 :", (await proxyBoxV1.retrieve()).toString())
    log("----------------------------------------------------")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
