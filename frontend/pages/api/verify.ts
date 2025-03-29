import { NextApiRequest, NextApiResponse } from 'next';
import { 
    getUserIdentifier, 
    SelfBackendVerifier,
} from '@selfxyz/core';
import {formatProof} from "../../../../self/common/src/utils/contracts/formatCallData";
import { ethers } from 'ethers';
import { abi } from '../../app/content/abi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { proof, publicSignals } = req.body;

            if (!proof || !publicSignals) {
                return res.status(400).json({ message: 'Proof and publicSignals are required' });
            }

            console.log("Proof:", proof);
            console.log("Public signals:", publicSignals);

            // Uncomment this to use the Self backend verifier for offchain verification instead
            // const selfdVerifier = new SelfBackendVerifier(
            //     'https://forno.celo.org',
            //     "Self-Denver-Birthday",
            //     "hex",
            // );
            // const result = await selfdVerifier.verify(proof, publicSignals);
            // console.log("Verification result:", result);

            const address = await getUserIdentifier(publicSignals, "hex");
            console.log("Extracted address from verification result:", address);

            // Contract details
            const contractAddress = "0x524548573CdC98197555eed20f008d4f4750248b";

            // Connect to Celo network
            const provider = new ethers.JsonRpcProvider("https://forno.celo.org");
            const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
            const contract = new ethers.Contract(contractAddress, abi, signer);

            try {
                const tx = await contract.verifySelfProof(formatProof(proof, publicSignals));
                await tx.wait();
                console.log("Successfully called verifySelfProof function");
                res.status(200).json({
                    status: 'success',
                    result: true,
                    credentialSubject: {},
                });
            } catch (error) {
                console.error("Error calling verifySelfProof function:", error);
                res.status(400).json({
                    status: 'error',
                    result: false,
                    message: 'Verification failed or date of birth not disclosed',
                    details: {},
                });
                throw error;
            }
        } catch (error) {
            console.error('Error verifying proof:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Error verifying proof',
                result: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}