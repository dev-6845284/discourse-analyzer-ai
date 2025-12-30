import User, { IUser, USER_ROLES } from '../models/User';
import * as apiKeyService from './apiKeyService';
import mongoose from 'mongoose';

export const getAllUsers = async () => {
  const users = await User.find({}, '-password').sort({ createdAt: -1 });
  
  // Fetch assigned keysets for each user
  const usersWithKeysets = await Promise.all(
    users.map(async (user) => {
      const userObj = user.toObject();
      const keyset = await getUserAssignedKeyset(user._id.toString());
      return {
        ...userObj,
        assignedKeysetId: keyset?._id,
        assignedKeysetAlias: keyset?.alias,
      };
    })
  );
  
  return usersWithKeysets;
};

export const createUser = async (userData: Partial<IUser>) => {
  // Validate role if provided
  if (userData.role && !USER_ROLES.includes(userData.role as any)) {
    throw new Error('Invalid role');
  }

  const user = new User(userData);
  await user.save();
  const userObj = user.toObject();
  const { password, ...userWithoutPassword } = userObj;
  return userWithoutPassword;
};

export const updateUser = async (id: string, userData: Partial<IUser>) => {
  // Prevent password update through this method
  delete userData.password;
  
  const user = await User.findByIdAndUpdate(id, userData, { new: true }).select('-password');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

export const deleteUser = async (id: string) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

export const changePassword = async (id: string, newPassword: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('User not found');
  }
  user.password = newPassword;
  await user.save();
  return { message: 'Password updated successfully' };
};

export const changePasswordWithVerification = async (id: string, oldPassword: string, newPassword: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify old password using bcrypt comparison (passwords are encrypted)
  const isPasswordValid = await user.comparePassword(oldPassword);
  if (!isPasswordValid) {
    throw new Error('Old password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  return { message: 'Password updated successfully' };
};

export const findUserByEmail = async (email: string) => {
  return User.findOne({ email });
};

export const getUserAssignedKeyset = async (userId: string) => {
  try {
    const assignments = await apiKeyService.listAssignmentsForUser(userId);
    if (assignments.length === 0) {
      return null;
    }
    const assignment = assignments[0]; // User can have at most one assigned keyset
    const keyset = await apiKeyService.getApiKeySetById_Internal(assignment.apiKeySetId.toString());
    return {
      _id: keyset?._id,
      alias: keyset?.alias,
    };
  } catch (error: any) {
    console.error('Error fetching user assigned keyset:', error);
    return null;
  }
};
