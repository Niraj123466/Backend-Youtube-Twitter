import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import {verifyJWT} from '../middlewares/auth.midddleware.js'

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token", refreshAccessToken)
router.route("/change-password", verifyJWT, changeCurrentPassword)
router.route("get-current-user", getCurrentUser)
router.route("/update-account-details", verifyJWT, updateAccountDetails)
router.route(
  "update-user-avatar", 
  upload.single({name : "avatar"}),
  verifyJWT,
  updateUserAvatar
)
router.route(
  "update-user-coverimage",
  upload.single({name : "coverImage"}),
  verifyJWT,
  updateUserCoverImage
)

export default router;
