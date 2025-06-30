import React, { useState } from "react";
import {
  Box,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack,
  HStack,
  Text,
  Icon,
  useDisclosure,
} from "@chakra-ui/react";
import { SettingsIcon } from "@chakra-ui/icons";
import { useTheme } from "../Context/ThemeProvider";

const ThemeSelector = () => {
  const { theme, currentTheme, changeTheme, themes } = useTheme();
  const { isOpen, onToggle, onClose } = useDisclosure();

  const ThemeOption = ({ themeKey, themeData }) => {
    const isActive = currentTheme === themeKey;
    
    return (
      <Button
        w="100%"
        h="60px"
        p={3}
        borderRadius="12px"
        border="2px solid"
        borderColor={isActive ? theme.colors.primary : theme.colors.border}
        bg={isActive ? theme.colors.primary : theme.colors.card}
        color={isActive ? theme.colors.buttonText : theme.colors.text}
        _hover={{
          bg: isActive ? theme.colors.buttonHover : theme.colors.cardHover,
          transform: "translateY(-2px)",
          boxShadow: `0 8px 25px ${theme.colors.shadowHover}`,
        }}
        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        onClick={() => {
          changeTheme(themeKey);
          onClose();
        }}
        position="relative"
        overflow="hidden"
      >
        <VStack spacing={1} w="100%">
          <Box
            w="20px"
            h="20px"
            borderRadius="50%"
            bg={themeData.gradients.primary}
            border="2px solid"
            borderColor={theme.colors.border}
          />
          <Text fontSize="12px" fontWeight="600">
            {themeData.name}
          </Text>
        </VStack>
        {isActive && (
          <Box
            position="absolute"
            top="8px"
            right="8px"
            w="8px"
            h="8px"
            borderRadius="50%"
            bg={theme.colors.accent}
            boxShadow={`0 0 8px ${theme.colors.accent}`}
          />
        )}
      </Button>
    );
  };

  return (
    <Popover isOpen={isOpen} onClose={onClose} placement="bottom-end">
      <PopoverTrigger>
        <Button
          onClick={onToggle}
          variant="ghost"
          size="sm"
          borderRadius="12px"
          p={2}
          color={theme.colors.text}
          _hover={{
            bg: theme.colors.cardHover,
            transform: "translateY(-1px)",
          }}
          transition="all 0.3s ease"
        >
          <Icon as={SettingsIcon} w={5} h={5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        bg={theme.colors.card}
        border="1px solid"
        borderColor={theme.colors.border}
        borderRadius="16px"
        boxShadow={`0 20px 40px ${theme.colors.shadow}`}
        w="200px"
        p={4}
      >
        <PopoverBody p={0}>
          <VStack spacing={3}>
            <Text
              fontSize="14px"
              fontWeight="600"
              color={theme.colors.text}
              textAlign="center"
              mb={2}
            >
              Choose Theme
            </Text>
            {Object.entries(themes).map(([key, themeData]) => (
              <ThemeOption key={key} themeKey={key} themeData={themeData} />
            ))}
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default ThemeSelector; 