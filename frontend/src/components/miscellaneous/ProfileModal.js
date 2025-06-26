import { ViewIcon } from "@chakra-ui/icons";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
  IconButton,
  Text,
  Image,
  Input,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";

const ProfileModal = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [picLoading, setPicLoading] = useState(false);
  const toast = useToast();
  const [profilePic, setProfilePic] = useState(user.pic);

  const handlePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPicLoading(true);
    if (file.type === "image/jpeg" || file.type === "image/png") {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "chat-app");
      data.append("cloud_name", "piyushproj");
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/piyushproj/image/upload", {
          method: "post",
          body: data,
        });
        const imgData = await res.json();
        if (imgData.url) {
          // Update user profile in backend
          await axios.put("/api/user/profile", { pic: imgData.url }, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          setProfilePic(imgData.url);
          // Optionally update localStorage and reload
          let updatedUser = JSON.parse(localStorage.getItem("userInfo")) || {};
          updatedUser.pic = imgData.url;
          localStorage.setItem("userInfo", JSON.stringify(updatedUser));
          toast({
            title: "Profile picture updated!",
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "bottom",
          });
        } else {
          throw new Error("Upload failed");
        }
      } catch (err) {
        toast({
          title: "Error updating picture",
          description: err.message,
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "bottom",
        });
      }
      setPicLoading(false);
    } else {
      toast({
        title: "Please select a JPEG or PNG image!",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      setPicLoading(false);
    }
  };

  return (
    <>
      {children ? (
        <span onClick={onOpen}>{children}</span>
      ) : (
        <IconButton d={{ base: "flex" }} icon={<ViewIcon />} onClick={onOpen} />
      )}
      <Modal size="lg" onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay />
        <ModalContent h="470px">
          <ModalHeader
            fontSize="40px"
            fontFamily="Work sans"
            d="flex"
            justifyContent="center"
          >
            {user.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody
            d="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="space-between"
          >
            <Image
              borderRadius="full"
              boxSize="150px"
              src={profilePic}
              alt={user.name}
            />
            <Button
              as="label"
              htmlFor="profile-pic-input"
              colorScheme="teal"
              size="sm"
              mt={2}
              isLoading={picLoading}
            >
              Change Picture
              <Input
                id="profile-pic-input"
                type="file"
                accept="image/*"
                display="none"
                onChange={handlePicChange}
              />
            </Button>
            <Text
              fontSize={{ base: "28px", md: "30px" }}
              fontFamily="Work sans"
            >
              Email: {user.email}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;
