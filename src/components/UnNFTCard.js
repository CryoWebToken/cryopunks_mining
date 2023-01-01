import { useEffect, useState } from "react";
import {
  StakingContract_Address,
  StakingContract_Address_NFT,
} from "../../config";
import { ScaleLoader } from "react-spinners";
import { errorAlert, successAlert } from "./toastGroup";
import { PageLoading } from "./Loading";
import { BigNumber } from "ethers";
import { toast } from "react-toastify";
export default function UnNFTCard({
  id,
  nftName,
  status,
  tokenId,
  signerAddress,
  updatePage,
  contract,
  contract_nft,
}) {
  console.log("status", status);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState("");
  const [reward, setReward] = useState(0);

  const getNftDetail = async () => {
    const uri = await contract_nft?.tokenURI(tokenId);
    const url = `https://ipfs.io/ipfs/QmaKBC7tJPtgnYn3C5p8GRQcY9pRhxG3vrkto8N5kW5svA/${tokenId}.json`;
    const imageUrl = `https://ipfs.io/ipfs/QmeQPsbhb3wRX7XVD54yJcfGM4SnmeFaiaXLLESuyccpiE/${tokenId}.png`;
    setImage(imageUrl);
    //await fetch(uri)
    //    .then(resp =>
    //        resp.json()
    //    ).catch((e) => {
    //        console.log(e);
    //    }).then((json) => {
    //        setImage(json?.image)
    //   });
    //
  };

  const getReward = async () => {
    const now = new Date().getTime() / 1000;
    const rate = parseFloat(await contract.getRewardRate()) / Math.pow(10, 18);
    console.log("rate", rate);
    const data = await contract.viewStake(id);
    // console.log("data", data)
    const diffInMinutes = (now - parseFloat(data.releaseTime)) / 60;
    // const reward =
    //   ((now - parseFloat(data.releaseTime)) * rate) / (24 * 60 * 60) / 25;

    // 5 comes from staking contract by hardcoding
    const reward = (diffInMinutes / 5) * rate;
    console.log("diifInminutes", { diffInMinutes, reward });

    setReward(reward);
  };

  const showReward = () => {
    getReward();
    setInterval(() => {
      getReward();
    }, 10000);
  };

  const onUnStake = async () => {
    setLoading(true);
    try {
      const unstake = await contract.cancelStake(BigNumber.from(id));
      await unstake.wait();
      successAlert("Unstaking is successful.");
      updatePage(signerAddress);
    } catch (error) {
      setLoading(false);
      errorAlert(error?.data?.message || error?.message);

      console.log(error);
    }
    setLoading(false);
  };
  const onCheck = async () => {
    setLoading(true);
    try {
      const check = await contract.checkStake(
        BigNumber.from(id),
        signerAddress
      );
      await check.wait();
      successAlert("Staking is checked. You can claim now");
      updatePage(signerAddress);
    } catch (error) {
      setLoading(false);
      errorAlert(error?.data?.message || error?.message);

      console.log(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    getNftDetail();
    showReward();
    // eslint-disable-next-line
  }, []);

  const onClaim = async () => {
    setLoading(true);
    try {
      const unstake = await contract.claimStake(BigNumber.from(id));
      await unstake.wait();
      successAlert("Claiming is successful.");
      updatePage(signerAddress);
    } catch (error) {
      setLoading(false);
      errorAlert(error?.data?.message || error?.message);
      console.log(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    getNftDetail();
    showReward();
    // eslint-disable-next-line
  }, []);
  return (
    <div className="nft-card">
      <div className="reward">
        <p>Reward:</p>
        <span>{parseFloat(reward).toLocaleString()} Cryogen</span>
      </div>
      {loading && (
        <div className="card-loading">
          <PageLoading />
        </div>
      )}
      <div className="media">
        {image === "" ? (
          <span className="empty-image empty-image-skeleton"></span>
        ) : (
          // eslint-disable-next-line
          <img src={image} alt="" style={{ opacity: loading ? 0 : 1 }} />
        )}
      </div>
      <div className={loading ? "card-action is-loading" : "card-action"}>
        {status === 0 && (
          <>
            <button className="btn-primary" onClick={onUnStake}>
              FIRE
            </button>
          </>
        )}
        {status === 0 && reward > 0 && (
          <>
            <button className="btn-primary" onClick={onCheck}>
              APPROVE
            </button>
          </>
        )}
        {status === 1 && (
          <button className="btn-primary" onClick={onClaim}>
            CLAIM
          </button>
        )}
      </div>
    </div>
  );
}
//after
