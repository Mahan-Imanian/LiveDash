import { useState, useEffect } from 'react'
import Modal from '@/components/modal'
import { Button } from '@/components/button/button'
import {
	useGetOccupations,
	useGetInterests,
} from '@/services/hooks/profile/getProfileMeta.hook'
import { LuChevronLeft } from 'react-icons/lu'
import { TextInput } from '@/components/text-input'
import { sleep } from '@/common/utils/timeout'
import { Chip } from '@/components/chip.component'
import { ItemSelector } from './item-selector'
import { useSetupWizard } from '@/services/hooks/auth/authService.hook'
import { showToast } from '@/common/toast'
import { safeAwait } from '@/services/api'
import Analytics from '@/analytics'

export enum ReferralSource {
	Social = 'social',
	Youtube = 'youtube',
	Friends = 'friends',
	SearchOther = 'search_other',
}

interface WelcomeWizardProps {
	isOpen: boolean
	onClose: () => void
}

const StepWrapper = ({ children }: { children: React.ReactNode }) => {
	return <div className="flex flex-col md:flex-row min-h-125">{children}</div>
}

const StepImage = ({ src }: { src: string; alt: string }) => {
	return (
		<div className="relative flex items-center justify-center w-full overflow-hidden bg-base-200/50 md:w-1/2 min-h-80 rounded-2xl group">
			<div
				className="absolute inset-0 transition-opacity duration-700 bg-center bg-cover"
				style={{
					backgroundImage: `url(${src})`,

					maskImage:
						'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 40%, rgba(0, 0, 0, 0.3) 90%, rgba(0, 0, 0, 0) 100%)',
					WebkitMaskImage:
						'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 40%, rgba(0, 0, 0, 0.3) 90%, rgba(0, 0, 0, 0) 100%)',
				}}
			/>
		</div>
	)
}

export const WelcomeWizard = ({ isOpen, onClose }: WelcomeWizardProps) => {
	const [currentStep, setCurrentStep] = useState(1)
	const [fetching, setFetching] = useState(false)
	const [selectedOccupation, setSelectedOccupation] = useState<string | null>(null)
	const [selectedInterests, setSelectedInterests] = useState<string[]>([])
	const [selectedReferralSource, setSelectedReferralSource] =
		useState<ReferralSource | null>(null)
	const [referralCode, setReferralCode] = useState<string>('')
	const totalSteps = 5

	const { mutateAsync, isPending } = useSetupWizard()

	const { data: occupations, isLoading: occupationsLoading } =
		useGetOccupations(fetching)
	const { data: interests, isLoading: interestsLoading } = useGetInterests(fetching)

	const nextStep = () => {
		Analytics.event(`welcome_wizard_step_${currentStep}_completed`)
		if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
		else onClose()
	}

	const prevStep = () => {
		if (currentStep > 1) setCurrentStep(currentStep - 1)
		Analytics.event('welcome_wizard_step_back_clicked')
	}

	useEffect(() => {
		const load = async () => {
			await sleep(300)
			setFetching(true)
		}
		load()
		Analytics.event('welcome_wizard_opened')
	}, [])

	const save = async () => {
		if (
			!selectedOccupation ||
			selectedInterests.length === 0 ||
			!selectedReferralSource
		) {
			showToast('Complete all steps.', 'error')
			return
		}

		const [err, _] = await safeAwait(
			mutateAsync({
				occupationId: selectedOccupation,
				interestsIds: selectedInterests,
				referralSource: selectedReferralSource,
				referralCode: referralCode || undefined,
			})
		)
		if (err) {
			showToast('Error submitting data. Try again.', 'error')
			Analytics.event('welcome_wizard_completion_failed')
			return
		}

		setCurrentStep(currentStep + 1)
		Analytics.event('welcome_wizard_completed')
	}

	const renderStepContent = () => {
		switch (currentStep) {
			case 1:
				return (
					<StepWrapper>
						<div className="flex flex-col items-center justify-center w-full p-8 text-center md:w-1/2 md:p-12">
							<div className="mb-10 space-y-4">
								<h2 className="text-2xl font-black text-content">
									Welcome!
								</h2>
								<p className="text-sm font-medium leading-loose opacity-70">
									We are glad you are here. Let us complete your profile
									so you get a better experience.
								</p>
							</div>
							<Button
								size="sm"
								onClick={nextStep}
								className="w-full h-12 text-base font-bold text-white shadow-lg rounded-2xl"
								isPrimary
							>
								Get started
							</Button>
						</div>
						<StepImage
							src="https://cdn.livedash.eu/extension/wizard/1.webp"
							alt="Welcome"
						/>
					</StepWrapper>
				)

			case 2:
				return (
					<StepWrapper>
						<div className="flex flex-col justify-between w-full p-4 md:w-1/2 md:p-10">
							<div className="w-full">
								<div className="mb-6 text-left">
									<h2 className="mb-2 text-2xl font-black text-content">
										What do you do?
									</h2>
									<p className="text-sm font-medium opacity-60">
										Choose your profession
									</p>
								</div>
								<div className="flex flex-wrap gap-2 overflow-y-auto max-h-75 scrollbar-none">
									{occupationsLoading ? (
										<div className="col-span-2 py-10 text-center animate-pulse">
											Loading...
										</div>
									) : (
										occupations?.map((job) => {
											const isSelected =
												selectedOccupation === job.id
											return (
												<Chip
													key={job.id}
													selected={isSelected}
													onClick={() =>
														setSelectedOccupation(job.id)
													}
												>
													{job.title}
												</Chip>
											)
										})
									)}
								</div>
							</div>
							<div className="flex gap-3 mt-6">
								<Button
									size="sm"
									onClick={nextStep}
									disabled={!selectedOccupation}
									className="flex-1 h-12 font-bold text-white rounded-2xl"
									isPrimary
								>
									Confirm and continue
								</Button>
							</div>
						</div>
						<StepImage
							src="https://cdn.livedash.eu/extension/wizard/2.webp"
							alt="Welcome"
						/>
					</StepWrapper>
				)

			case 3:
				return (
					<StepWrapper>
						<div className="flex flex-col justify-between w-full p-8 md:w-1/2 md:p-10">
							<div className="w-full">
								<div className="mb-6 text-left">
									<h2 className="mb-2 text-2xl font-black text-content">
										What are you interested in?
									</h2>
									<p className="text-sm font-medium opacity-60">
										Select as many as you like
									</p>
								</div>
								<div className="flex flex-wrap gap-2 overflow-y-auto max-h-75 scrollbar-none">
									{interestsLoading ? (
										<div className="w-full py-10 text-center animate-pulse">
											Loading...
										</div>
									) : (
										interests?.map((item) => {
											const isSelected = selectedInterests.includes(
												item.id
											)
											return (
												<Chip
													key={item.id}
													selected={isSelected}
													onClick={() => {
														if (isSelected)
															setSelectedInterests(
																selectedInterests.filter(
																	(id) => id !== item.id
																)
															)
														else
															setSelectedInterests([
																...selectedInterests,
																item.id,
															])
													}}
												>
													{item.title}
												</Chip>
											)
										})
									)}
								</div>
							</div>
							<div className="flex gap-3 mt-6">
								<Button
									size="sm"
									onClick={nextStep}
									disabled={selectedInterests.length === 0}
									className="flex-1 h-12 font-bold text-white rounded-2xl"
									isPrimary
								>
									Continue
								</Button>
							</div>
						</div>
						<StepImage
							src="https://cdn.livedash.eu/extension/wizard/3.webp"
							alt="Welcome"
						/>
					</StepWrapper>
				)

			case 4:
				return (
					<StepWrapper>
						<div className="flex flex-col items-center justify-center w-full p-8 text-center md:w-1/2 md:p-12">
							<div className="mb-10 space-y-4">
								<h2 className="text-2xl font-black text-content">
									Step 4: Where did you hear about us?
								</h2>
								<p className="text-sm font-medium leading-loose opacity-70 text-balance">
									Tell us where you heard about LiveDash.
								</p>
							</div>

							<div className="w-full max-w-md space-y-4">
								<div className="flex flex-wrap gap-2">
									{[
										{
											value: ReferralSource.Social,
											label: 'Social media',
										},
										{
											value: ReferralSource.Youtube,
											label: 'YouTube',
										},
										{
											value: ReferralSource.Friends,
											label: 'Friends',
										},
										{
											value: ReferralSource.SearchOther,
											label: 'Search or other',
										},
									].map((option) => (
										<ItemSelector
											isActive={
												selectedReferralSource === option.value
											}
											label={option.label}
											key={option.value}
											onClick={() =>
												setSelectedReferralSource(option.value)
											}
										/>
									))}
								</div>

								{selectedReferralSource === ReferralSource.Friends && (
									<div className="mt-4">
										<TextInput
											value={referralCode}
											onChange={setReferralCode}
											placeholder="Enter referral code"
										/>
									</div>
								)}
							</div>

							<Button
								size="sm"
								onClick={() => save()}
								disabled={!selectedReferralSource || isPending}
								loading={isPending}
								className="w-full h-12 mt-4 text-base font-bold text-white shadow-lg rounded-2xl"
								isPrimary
							>
								Continue
							</Button>
						</div>
						<StepImage
							src="https://cdn.livedash.eu/extension/wizard/4.webp"
							alt="Welcome"
						/>
					</StepWrapper>
				)

			case 5:
				return (
					<StepWrapper>
						<div className="flex flex-col items-center justify-center w-full p-8 text-center md:w-1/2 md:p-12">
							<div className="mb-10 space-y-4">
								<h2 className="text-2xl font-black text-content">
									Everything is ready. 🚀
								</h2>
								<p className="text-sm font-medium leading-loose opacity-70">
									Your profile setup is complete. You can now use
									all features.
								</p>
							</div>
							<Button
								size="sm"
								onClick={onClose}
								className="w-full h-12 text-base font-bold text-white shadow-lg rounded-2xl"
								isPrimary
							>
								Start using
							</Button>
						</div>
						<StepImage
							src="https://cdn.livedash.eu/extension/wizard/5.webp"
							alt="Welcome"
						/>
					</StepWrapper>
				)
		}
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="xl" direction="ltr" title=" ">
			<div className="relative overflow-hidden rounded bg-base-100">
				{currentStep > 1 && currentStep < totalSteps && (
					<button
						onClick={prevStep}
						className="absolute z-20 p-2 transition-colors rounded-full top-10 right-96 bg-base-200/50 text-content hover:bg-base-300"
					>
						<LuChevronLeft size={20} />
					</button>
				)}
				{renderStepContent()}
			</div>
		</Modal>
	)
}
