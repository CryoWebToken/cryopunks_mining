import React, { useEffect, useState } from "react";
import Head from "next/head"
import Header from "../components/Header";
import styles from "../styles/Home.module.css";
import Web3 from "web3"
import Web3Modal from "web3modal"
import { ethers, providers } from "ethers"
import { providerOptions } from "../contracts/utils"
import { CHAIN_ID, NETWORK, SITE_ERROR, SMARCONTRACT_INI_ABI, SMARTCONTRACT_ABI_ERC20, SMARTCONTRACT_ADDRESS_ERC20, StakingContract_ABI, StakingContract_Address, StakingContract_Address_NFT } from "../../config"
import NFTCard from "../components/NFTCard";
import { errorAlertCenter, successAlert } from "../components/toastGroup";
import { Container, Grid, Button } from "@mui/material";
import UnNFTCard from "../components/UnNFTCard";
import { PageLoading } from "../components/Loading";

let web3Modal = undefined;
let contract = undefined;
let contract_20 = undefined;
let contract_nft = undefined;

export default function Home() {
    const [connected, setConnected] = useState(false);
    const [signerAddress, setSignerAddress] = useState("");
    const [unstakedNFTs, setUnstakedNFTs] = useState();
    const [stakedNFTs, setStakedNFTs] = useState();
    const [loading, setLoading] = useState(false);
    const [totalStaked, setTotalStaked] = useState(0);
    const [stakeAllLoading, setStakeAllLoading] = useState(false);
    const [unstakeAllLoading, setUnstakeAllLoading] = useState(false);
    const [claimAllLoading, setClaimAllLoading] = useState(false);
    const [dailyRewardRate, setDailyRewardRate] = useState(0);

    const connectWallet = async () => {
        if (await checkNetwork()) {
            setLoading(true)
            web3Modal = new Web3Modal({
                network: NETWORK, // optional
                cacheProvider: true,
                providerOptions, // required
            })
            try {
                const provider = await web3Modal.connect();
                const web3Provider = new providers.Web3Provider(provider);
                const signer = web3Provider.getSigner();
                const address = await signer.getAddress();

                setConnected(true);
                setSignerAddress(address);

                contract = new ethers.Contract(
                    StakingContract_Address,
                    StakingContract_ABI,
                    signer
                );

                contract_nft = new ethers.Contract(
                    StakingContract_Address_NFT,
                    SMARCONTRACT_INI_ABI,
                    signer
                );

                contract_20 = new ethers.Contract(
                    SMARTCONTRACT_ADDRESS_ERC20,
                    SMARTCONTRACT_ABI_ERC20,
                    signer
                );
                setDailyRewardRate((await contract.getRewardRate()) / Math.pow(10, 18) / 25)

                /////////////////
                updatePage(address);
                /////////////////

                // Subscribe to accounts change
                provider.on("accountsChanged", (accounts) => {
                    console.log(accounts[0], '--------------');
                });
            } catch (error) {
                console.log(error)
            }
        }
    }

    const updatePage = async (address) => {
        setLoading(true)
        let unstaked = []
        let staked = []
        const balance = await contract_nft.balanceOf(address)
        const totalSupply = await contract.getTotalStaked()
        let total = 0
        try {
            console.log("contract", await contract_nft.walletOfOwner(address));
            
            let promise_index = await contract_nft.walletOfOwner(address);

            const indexData = await Promise.all(promise_index);
            for (let i = 0; i < indexData.length; i++) {
                unstaked.push(
                    {
                        id: parseInt(indexData[i]),
                        tokenId: parseInt(indexData[i])
                    }
                )
            }
            let promise = [];
            for (let i = 0; i < parseInt(totalSupply); i++) {
                promise.push(contract.viewStake(i))
            }
            const data = await Promise.all(promise);
            const now = new Date().getTime() / 1000;
            const rate = parseFloat(await contract.getRewardRate()) / Math.pow(10, 18);

            for (let i = 0; i < data.length; i++) {
                if (data[i].status === 1) {
                    // console.log(i, "pool ID--------------------------");
                }
                if (data[i].status === 0) {
                    total++
                    if (data[i].staker.toLowerCase() === address.toLowerCase()) {
                        console.log(rate)
                        staked.push(
                            {
                                id: i,
                                tokenId: data[i].tokenId.toNumber(),
                                status: data[i].status
                            }
                        )
                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
        setUnstakedNFTs(unstaked);
        setStakedNFTs(staked);
        setTotalStaked(total);
        setLoading(false);
    }

    const checkNetwork = async () => {
        const web3 = new Web3(Web3.givenProvider)
        const chainId = await web3.eth.getChainId()
        if (chainId === CHAIN_ID) {
            return true
        } else {
            errorAlertCenter(SITE_ERROR[0])
            return false
        }
    }

    const onStakeAll = async () => {
        setStakeAllLoading(true);
        let unstaked = [];
        for (let item of unstakedNFTs) {
            unstaked.push(item.id);
        }
        try {
            const approved = await contract_nft.isApprovedForAll(signerAddress, StakingContract_Address);
            console.log(approved, "approved")
            if (!approved) {
                const approve = await contract_nft.setApprovalForAll(StakingContract_Address, true)
                await approve.wait();
            }
            const stake = await contract.callStakeToken(StakingContract_Address_NFT, unstaked)
            await stake.wait();
            successAlert("Staking is successful.")
            updatePage(signerAddress)
        } catch (error) {
            setStakeAllLoading(false)
            console.log(error)
        }
        setStakeAllLoading(false);
    }

    const onUnstakeAll = async () => {
        setUnstakeAllLoading(true);
        let staked = [];
        for (let item of stakedNFTs) {
            staked.push(item.id);
        }
        try {
            const unstake = await contract.unStake(staked);
            await unstake.wait();
            successAlert("Unstaking is successful.");
            updatePage(signerAddress);
        } catch (error) {
            setUnstakeAllLoading(false);
            console.log(error);
        }
        setUnstakeAllLoading(false)
    }

    const onClaimAll = async () => {
        setClaimAllLoading(true);
        let staked = [];
        for (let item of stakedNFTs) {
            staked.push(item.id);
        }
        try {
            const unstake = await contract.claimReward(staked)
            await unstake.wait();
            successAlert("Claiming is successful.")
            updatePage(signerAddress)
        } catch (error) {
            setClaimAllLoading(false)
            console.log(error)
        }
        setClaimAllLoading(false)
    }

    useEffect(() => {
        async function fetchData() {
            if (typeof window.ethereum !== 'undefined') {
                if (await checkNetwork()) {
                    await connectWallet();
                    ethereum.on('accountsChanged', function (accounts) {
                        window.location.reload();
                    });
                    if (ethereum.selectedAddress !== null) {
                        setSignerAddress(ethereum.selectedAddress);
                        setConnected(true);
                    }
                    ethereum.on('chainChanged', (chainId) => {
                        checkNetwork();
                    })
                }
            } else {
                errorAlertCenter(SITE_ERROR[1])
            }
        }
        fetchData()
        // eslint-disable-next-line
    }, [])

    return (
        <>
            <Head >
                <title>Let Your Stevies Mine Cryogen</title>
                <meta name="description" content="Cryopunks NFT mining for Cryogen" />
                <meta property="og:url" content="https://cryogen.life" />
                <meta property="og:title" content="Cryopunks NFT Mining" />
                <meta property="og:description" content="Stake your cryopunks NFTs to mine cryogen daily" />
                <meta property="og:image" content="https://cryogen.life/images/smallICO.png" />
                <meta property="og:image:type" content="image/png" />
                <meta property="og:image:alt" content="Cryogen defi the world" />
                <meta property="og:site_name" content="Cryopunks NFT BSC Mining dApp" />
                <link rel="icon" href="/favicon.ico" />
                <meta name="google-site-verification" content="X0NY0qUsMz_k-q_7Ew86Whh1LJsWHfRlh5Q0OfgkQ_4" />
            </Head >
            <main className={styles.main}>
                <Header
                    signerAddress={signerAddress}
                    connectWallet={() => connectWallet()}
                    connected={connected}
                />
                <div className="top-title">
                    <Container maxWidth="lg">
                        <h2 className="title">
                            Let Your Stevies Mine Cryogen
                        </h2>
                        <p className="blink">DO NOT START MINING YET!!</p>
                   
                        <p className="reward-rate">Daily Hashrate Per Stevie: <span>{dailyRewardRate === 0 ? "??" : dailyRewardRate} Cryogen</span></p>
                    </Container>
                </div>
                {connected &&
                    <Container>
                        <div className="main-page">
                            <div className="title-bar">
                                <h2>Total Stevies In The Mine: {totalStaked}</h2>
                            </div>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <div className="nft-box">
                                        <div className="box-header">
                                            <h3>Your Unemployed Stevies {unstakedNFTs?.length && `(${unstakedNFTs?.length})`}</h3>
                                            <div className="box-control">
                                                <button className="btn-second" onClick={onStakeAll} disabled={stakeAllLoading}>
                                                    {stakeAllLoading ?
                                                        <div className="btn-loading">
                                                            <PageLoading />
                                                        </div>
                                                        :
                                                        <>Send To Mine</>
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                        <div className="box">
                                            {loading ?
                                                <PageLoading />
                                                :
                                                <div className="box-content">
                                                    {unstakedNFTs && unstakedNFTs.length !== 0 && unstakedNFTs.map((item, key) => (
                                                        <NFTCard
                                                            id={item.id}
                                                            key={key}
                                                            tokenId={item.tokenId}
                                                            signerAddress={signerAddress}
                                                            updatePage={() => updatePage(signerAddress)}
                                                            contract={contract}
                                                            contract_nft={contract_nft}
                                                        />
                                                    ))}
                                                </div>

                                            }
                                        </div>
                                    </div>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <div className="nft-box">
                                        <div className="box-header">
                                            <h3>Stevies Mining {stakedNFTs?.length && `(${stakedNFTs?.length})`}</h3>
                                            <div className="box-control">
                                                <button className="btn-second" onClick={onUnstakeAll} disabled={unstakeAllLoading}>
                                                    {unstakeAllLoading ?
                                                        <div className="btn-loading">
                                                            <PageLoading />
                                                        </div>
                                                        :
                                                        <>FIRE ALL</>
                                                    }
                                                </button>
                                                <button className="btn-second" onClick={onClaimAll} disabled={claimAllLoading}>
                                                    {claimAllLoading ?
                                                        <div className="btn-loading">
                                                            <PageLoading />
                                                        </div>
                                                        :
                                                        <>CASH OUT</>
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                        <div className="box">
                                            {loading ?
                                                <PageLoading />
                                                :
                                                <div className="box-content">
                                                    {stakedNFTs && stakedNFTs.length !== 0 && stakedNFTs.map((item, key) => (
                                                        <UnNFTCard
                                                            key={key}
                                                            id={item.id}
                                                            tokenId={item.tokenId}
                                                            signerAddress={signerAddress}
                                                            updatePage={() => updatePage(signerAddress)}
                                                            contract={contract}
                                                            contract_nft={contract_nft}
                                                        />
                                                    ))}
                                                </div>
                                            }
                                        </div>
                                    </div>
                                </Grid>
                            </Grid>
                        </div>
                    </Container>
                }
            </main>
            {/* eslint-disable-next-line */}
            <img
                src="/kongbackground.gif"
                className="background"
                alt=""
            />
        </>
    )
}
