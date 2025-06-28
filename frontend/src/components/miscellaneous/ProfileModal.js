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
  FormControl,
  FormLabel,
  VStack,
  HStack,
  Divider,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";

const ProfileModal = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [picLoading, setPicLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const toast = useToast();
  const [profilePic, setProfilePic] = useState(user.pic);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProfileUpdate = async () => {
    // Validate password confirmation
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    // Validate password length
    if (formData.password && formData.password.length < 6) {
      toast({
        title: "Password must be at least 6 characters",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    setProfileLoading(true);
    try {
      const updateData = {};
      if (formData.name !== user.name) updateData.name = formData.name;
      if (formData.email !== user.email) updateData.email = formData.email;
      if (formData.password) updateData.password = formData.password;

      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No changes to update",
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "bottom",
        });
        setProfileLoading(false);
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };

      const { data } = await axios.put("/api/user/profile", updateData, config);

      // Update localStorage
      let updatedUser = JSON.parse(localStorage.getItem("userInfo")) || {};
      updatedUser = { ...updatedUser, ...data };
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));

      // Reset password fields
      setFormData(prev => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));

      toast({
        title: "Profile updated successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });

      // Close modal and reload page to reflect changes
      onClose();
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: error.response?.data?.message || "Failed to update profile",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
    setProfileLoading(false);
  };

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
      {children && <span onClick={onOpen}>{children}</span>}
      <Modal size="lg" onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay />
        <ModalContent maxH="80vh" overflowY="auto">
          <ModalHeader
            fontSize="40px"
            fontFamily="Work sans"
            d="flex"
            justifyContent="center"
          >
            Profile Settings
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              {/* Profile Picture Section */}
              <VStack spacing={3}>
                <Image
                  borderRadius="full"
                  boxSize="120px"
                  src={profilePic}
                  alt={user.name}
                />
                <Button
                  as="label"
                  htmlFor="profile-pic-input"
                  colorScheme="teal"
                  size="sm"
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
              </VStack>

              <Divider />

              {/* Profile Information Section */}
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" mb={2}>
                  Profile Information
                </Text>
                
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>New Password (leave blank to keep current)</FormLabel>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Confirm New Password</FormLabel>
                  <Input
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm new password"
                  />
                </FormControl>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button onClick={onClose} variant="ghost">
                Cancel
              </Button>
              <Button
                colorScheme="teal"
                onClick={handleProfileUpdate}
                isLoading={profileLoading}
              >
                Update Profile
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;
