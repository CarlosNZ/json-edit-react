import React from 'react'
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { WarningTwoIcon } from '@chakra-ui/icons'
import type { ConfirmDialogState } from '@json-edit-react/utils'

// Demo of "bring your own modal": the confirm hooks ship no UI — the `dialog`
// object is the only contract. Here we drive a Chakra modal off it; any modal
// library (or a plain div) wires up the same way.
export const ConfirmDialog: React.FC<ConfirmDialogState> = (dialog) => (
  <Modal isOpen={dialog.isOpen} onClose={dialog.onCancel} isCentered>
    <ModalOverlay />
    <ModalContent>
      <ModalHeader display="flex" alignItems="center" gap={2}>
        <WarningTwoIcon color="orange.400" />
        {dialog.title ?? 'Are you sure?'}
      </ModalHeader>
      <ModalBody>{dialog.message}</ModalBody>
      <ModalFooter gap={3}>
        <Button variant="outline" colorScheme="blue" onClick={dialog.onCancel}>
          Cancel
        </Button>
        <Button colorScheme="blue" onClick={dialog.onConfirm}>
          OK
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
)
